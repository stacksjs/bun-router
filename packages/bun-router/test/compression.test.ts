// Compressing what goes back.
//
// Static files have been served gzipped for a long time; every response a route
// produced went out whole. The application this was found in serves a 253 KB
// HTML page, uncompressed, to every visitor on every request.
//
// The cases below are the ones where compressing is *wrong*, because those are
// the ones that break something rather than merely miss a saving: a stream that
// must stay progressive, a client that did not ask, a cache that would then
// serve the wrong copy to the next client.

import { describe, expect, test } from 'bun:test'
import { appendVary, applyResponseCompression, compressResponse, isCompressible, negotiateEncoding, peekBody, shouldCompress } from '../src/response/compression'

const LONG = 'ReviewOS renders its pages on the server. '.repeat(200)

function asked(encoding = 'gzip, deflate, br'): Request {
  return new Request('http://localhost/', { headers: { 'accept-encoding': encoding } })
}

function html(body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': String(new TextEncoder().encode(body).byteLength), ...headers } })
}

describe('what the client offered', () => {
  test('gzip before deflate, and nothing when neither is offered', () => {
    expect(negotiateEncoding('gzip, deflate')).toBe('gzip')
    expect(negotiateEncoding('deflate')).toBe('deflate')
    expect(negotiateEncoding('br')).toBeNull()
    expect(negotiateEncoding(null)).toBeNull()
  })

  test('`q=0` is a refusal, not a preference', () => {
    // A client that says `gzip;q=0` means it. Sending gzip anyway is how one
    // browser gets an unreadable page.
    expect(negotiateEncoding('gzip;q=0, deflate')).toBe('deflate')
    expect(negotiateEncoding('gzip;q=0, deflate;q=0')).toBeNull()
  })

  test('and `*` covers what was not named', () => {
    expect(negotiateEncoding('*')).toBe('gzip')
  })
})

describe('what is worth compressing', () => {
  test('text and the text-shaped application types', () => {
    expect(isCompressible('text/html; charset=utf-8')).toBe(true)
    expect(isCompressible('application/json')).toBe(true)
    expect(isCompressible('application/x-ndjson')).toBe(true)
    expect(isCompressible('image/svg+xml')).toBe(true)
  })

  test('and not bytes that are already compressed', () => {
    // These grow. A wasted cycle and a wasted byte.
    expect(isCompressible('image/png')).toBe(false)
    expect(isCompressible('font/woff2')).toBe(false)
    expect(isCompressible('application/zip')).toBe(false)
    expect(isCompressible(null)).toBe(false)
  })
})

describe('the rules', () => {

  test('does not materialize the body stream for a known short response', async () => {
    const response = html('tiny')
    let bodyReads = 0
    const getBody = Object.getOwnPropertyDescriptor(Response.prototype, 'body')!.get!
    Object.defineProperty(response, 'body', {
      get() {
        bodyReads++
        return getBody.call(this)
      },
    })
    const answer = applyResponseCompression(response, asked())

    expect(answer).toBe(response)
    expect(bodyReads).toBe(0)
    expect(response.headers.get('vary')).toBe('Accept-Encoding')
    expect(await response.text()).toBe('tiny')
  })

  test('requires a body even when its declared length exceeds the threshold', () => {
    const response = new Response(null, {
      headers: { 'content-type': 'text/plain', 'content-length': '4096' },
    })
    expect(shouldCompress(response, 'gzip', 1024)).toBe(false)
  })

  test('a body below the threshold is left alone', () => {
    expect(shouldCompress(html('small'), 'gzip', 1024)).toBe(false)
    expect(shouldCompress(html(LONG), 'gzip', 1024)).toBe(true)
  })

  /*
   * A length is a hint, not a requirement. Bun puts no `Content-Length` on a
   * `Response` built from a string, so reading its absence as "this is a
   * stream, leave it alone" left every server-rendered page uncompressed -
   * which is the exact case this exists for.
   */
  test('a body with no declared length is still compressed, by piping', () => {
    const streamed = new Response(new ReadableStream(), { headers: { 'content-type': 'application/x-ndjson' } })
    const fromString = new Response('a'.repeat(4000), { headers: { 'content-type': 'text/html' } })

    expect(fromString.headers.get('content-length')).toBeNull()
    expect(shouldCompress(streamed, 'gzip', 1024)).toBe(true)
    expect(shouldCompress(fromString, 'gzip', 1024)).toBe(true)
  })

  test('an already-encoded response is not encoded twice', () => {
    expect(shouldCompress(html(LONG, { 'content-encoding': 'gzip' }), 'gzip', 1024)).toBe(false)
  })

  test('and a body-less status is not a body', () => {
    const notModified = new Response(null, { status: 304, headers: { 'content-type': 'text/html', 'content-length': '4000' } })

    expect(shouldCompress(notModified, 'gzip', 1024)).toBe(false)
  })
})

describe('compression eligibility before negotiation', () => {
  test('preserves short responses and Vary for every encoding offer', async () => {
    for (const encoding of ['', 'identity', 'gzip, deflate, br', 'gzip;q=0, deflate;q=0', '*', 'gzip;q=0, *;q=1']) {
      const response = html('tiny', { vary: 'Origin' })
      const answer = applyResponseCompression(response, asked(encoding))

      expect(answer).toBe(response)
      expect(response.headers.get('content-encoding')).toBeNull()
      expect(response.headers.get('vary')).toBe('Origin, Accept-Encoding')
      expect(await response.text()).toBe('tiny')
    }
  })

  test('compresses at the exact threshold and honors a refusal there', async () => {
    for (const [encoding, expected] of [['gzip', 'gzip'], ['gzip;q=0, deflate', 'deflate'], ['gzip;q=0, deflate;q=0', null]] as const) {
      const response = html('tiny')
      const answer = await applyResponseCompression(response, asked(encoding), { threshold: 4 })

      expect(answer.headers.get('content-encoding')).toBe(expected)
      if (expected) {
        const decoded = new Response(answer.body!.pipeThrough(new DecompressionStream(expected)))
        expect(await decoded.text()).toBe('tiny')
      }
      else {
        expect(answer).toBe(response)
        expect(await answer.text()).toBe('tiny')
      }
    }
  })

  test('keeps absent and malformed lengths eligible for compression', async () => {
    for (const length of [null, 'unknown']) {
      const response = html(LONG)
      if (length === null)
        response.headers.delete('content-length')
      else
        response.headers.set('content-length', length)
      const answer = await applyResponseCompression(response, asked())

      expect(answer.headers.get('content-encoding')).toBe('gzip')
      expect(new TextDecoder().decode(Bun.gunzipSync(new Uint8Array(await answer.arrayBuffer())))).toBe(LONG)
    }
  })

  test('does not read an unknown-length body when the client refuses compression', async () => {
    const response = new Response('tiny', { headers: { 'content-type': 'text/plain' } })
    Object.defineProperty(response, 'body', {
      get() { throw new Error('the body must stay untouched') },
    })

    expect(applyResponseCompression(response, asked('gzip;q=0, deflate;q=0'))).toBe(response)
    expect(await response.text()).toBe('tiny')
  })

  test('preserves non-finite threshold decisions for known lengths', async () => {
    for (const threshold of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const response = html('tiny')
      expect(applyResponseCompression(response, asked(), { threshold })).toBe(response)
      expect(response.headers.get('vary')).toBe('Accept-Encoding')
      expect(await response.text()).toBe('tiny')
    }
  })
})

describe('compressing', () => {
  test('keeps the common uncompressed path synchronous', () => {
    const noEncoding = applyResponseCompression(html(LONG), new Request('http://localhost/'))
    const tooSmall = applyResponseCompression(html('tiny'), asked())

    expect(noEncoding).toBeInstanceOf(Response)
    expect(tooSmall).toBeInstanceOf(Response)
  })

  test('keeps known-length compression synchronous', () => {
    const answer = applyResponseCompression(html(LONG), asked())

    expect(answer).toBeInstanceOf(Response)
    expect((answer as Response).headers.get('content-encoding')).toBe('gzip')
  })

  test('shrinks the body and says how', async () => {
    const answer = await compressResponse(html(LONG), asked())

    expect(answer.headers.get('content-encoding')).toBe('gzip')

    // And the bytes are the bytes: gunzip returns what went in.
    const gunzipped = Bun.gunzipSync(new Uint8Array(await answer.arrayBuffer()))

    expect(new TextDecoder().decode(gunzipped)).toBe(LONG)
  })

  test('deflate when that is all the client takes', async () => {
    const answer = await compressResponse(html(LONG), asked('deflate'))

    expect(answer.headers.get('content-encoding')).toBe('deflate')

    // Decompressed the same way a browser would. HTTP's `deflate` is the
    // zlib-wrapped form, which is what `CompressionStream` produces and what
    // `Bun.inflateSync` - raw deflate - refuses.
    const inflated = new Response(answer.body!.pipeThrough(new DecompressionStream('deflate')))

    expect(await inflated.text()).toBe(LONG)
  })

  /*
   * The property that matters most here: a response that streams keeps
   * streaming. The diff manifest sends a hundred files as they parse, and a
   * compression step that read the whole body first would turn that into a
   * wait - a worse trade than the bytes are worth.
   */
  test('a stream stays a stream, and comes out compressed', async () => {
    // Above the threshold, because below it the right answer is not to
    // compress at all - a manifest of three short lines is not worth a gzip
    // header. A real one carries a record per file.
    const chunks = Array.from({ length: 40 }, (_, at) => `${JSON.stringify({ type: 'file', at, path: `app/Actions/Deep/Nested/File${at}.ts`, additions: at, deletions: at })}\n`)

    let closed = false
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks)
          controller.enqueue(new TextEncoder().encode(chunk))

        controller.close()
        closed = true
      },
    })

    const answer = await compressResponse(
      new Response(source, { headers: { 'content-type': 'application/x-ndjson' } }),
      asked(),
    )

    expect(answer.headers.get('content-encoding')).toBe('gzip')
    // No length: it is not known until the body ends, and a wrong one is a
    // truncated response rather than a slow one.
    expect(answer.headers.get('content-length')).toBeNull()
    expect(closed).toBe(true)

    const gunzipped = Bun.gunzipSync(new Uint8Array(await answer.arrayBuffer()))

    expect(new TextDecoder().decode(gunzipped)).toBe(chunks.join(''))
  })

  test('a body below the threshold is sent as it was', async () => {
    const answer = await compressResponse(html('tiny'), asked())

    expect(answer.headers.get('content-encoding')).toBeNull()
    expect(await answer.text()).toBe('tiny')
  })

  test('and a client that did not ask gets what it asked for', async () => {
    const answer = await compressResponse(html(LONG), new Request('http://localhost/'))

    expect(answer.headers.get('content-encoding')).toBeNull()
    expect(await answer.text()).toBe(LONG)
  })
})

describe('Vary', () => {
  /*
   * A cache that stores a compressed copy and hands it to a client that cannot
   * read it is the classic failure here, and it is why `Vary` goes on the
   * uncompressed branch too.
   */
  test('is set whether or not anything was compressed', async () => {
    const compressed = await compressResponse(html(LONG), asked())
    const untouched = await compressResponse(html('small'), asked())

    expect(compressed.headers.get('vary')).toBe('Accept-Encoding')
    expect(untouched.headers.get('vary')).toBe('Accept-Encoding')
  })

  test('and does not trample what was already there', () => {
    const headers = new Headers({ vary: 'Origin' })

    appendVary(headers, 'Accept-Encoding')
    appendVary(headers, 'Accept-Encoding')

    expect(headers.get('vary')).toBe('Origin, Accept-Encoding')
  })

  test('a wildcard already covers everything', () => {
    const headers = new Headers({ vary: '*' })

    appendVary(headers, 'Accept-Encoding')

    expect(headers.get('vary')).toBe('*')
  })
})

describe('turning it off', () => {
  test('leaves the response exactly as it was', async () => {
    // For a deployment where the proxy in front already compresses.
    const answer = await compressResponse(html(LONG), asked(), { enabled: false })

    expect(answer.headers.get('content-encoding')).toBeNull()
    expect(answer.headers.get('vary')).toBeNull()
  })
})

describe('the threshold without a length', () => {
  /*
   * Bun sets no `Content-Length` on a string body, so "is this worth
   * compressing" cannot be answered from the headers. Reading a kilobyte
   * answers it without buffering the response: a stream that carries on keeps
   * its prefix and keeps streaming, and one that ended inside that kilobyte
   * was a small answer all along. `/api/health` is 356 bytes, and it was being
   * compressed.
   */
  test('a small answer with no declared length is left alone', async () => {
    const small = new Response(JSON.stringify({ ok: true, uptime: 1234 }), { headers: { 'content-type': 'application/json' } })

    expect(small.headers.get('content-length')).toBeNull()

    const answer = await compressResponse(small, asked())

    expect(answer.headers.get('content-encoding')).toBeNull()
    expect(await answer.json()).toEqual({ ok: true, uptime: 1234 })
  })

  test('and a long one is compressed', async () => {
    const answer = await compressResponse(
      new Response(LONG, { headers: { 'content-type': 'text/html' } }),
      asked(),
    )

    expect(answer.headers.get('content-encoding')).toBe('gzip')
    expect(new TextDecoder().decode(Bun.gunzipSync(new Uint8Array(await answer.arrayBuffer())))).toBe(LONG)
  })

  test('peeking keeps every byte, and says whether the body ended', async () => {
    const chunks = ['one:', 'two:', 'three']
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks)
          controller.enqueue(new TextEncoder().encode(chunk))

        controller.close()
      },
    })

    const peeked = await peekBody(source, 1024)

    expect(peeked.ended).toBe(true)
    expect(peeked.size).toBe(13)
    expect(await new Response(peeked.stream).text()).toBe('one:two:three')
  })

  test('and stops reading once it has enough', async () => {
    let produced = 0
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        produced += 1
        controller.enqueue(new TextEncoder().encode('x'.repeat(64)))
      },
    })

    const peeked = await peekBody(source, 128)

    // Two chunks reach the limit; a third would mean the peek is reading the
    // whole body, which is the thing it exists not to do.
    expect(produced).toBeLessThanOrEqual(3)
    expect(peeked.ended).toBe(false)
    expect(peeked.size).toBeGreaterThanOrEqual(128)
  })
})

describe('an event stream', () => {
  test('is never compressed, because it is a live channel', async () => {
    // Compression holds bytes back until it has something worth emitting, so a
    // compressed event stream arrives in clumps - or, on a quiet channel, not
    // until it closes.
    expect(isCompressible('text/event-stream')).toBe(false)

    const events = new Response(new ReadableStream(), { headers: { 'content-type': 'text/event-stream' } })
    const answer = await compressResponse(events, asked())

    expect(answer.headers.get('content-encoding')).toBeNull()
  })
})
