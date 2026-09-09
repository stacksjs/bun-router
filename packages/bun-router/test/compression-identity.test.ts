import { describe, expect, test } from 'bun:test'
import { applyResponseCompression } from '../src/response/compression'

function request(offer: string): Request {
  return new Request('http://localhost/', { headers: { 'accept-encoding': offer } })
}

describe('identity refusal', () => {
  test('encodes small known and unknown lengths when identity is refused', async () => {
    for (const knownLength of [false, true]) {
      for (const [offer, encoding] of [
        ['gzip, identity;q=0', 'gzip'],
        ['gzip;q=0.2, deflate;q=0.8, identity;q=0', 'deflate'],
        ['*;q=0, gzip', 'gzip'],
        ['gzip, IDENTITY;Q=0.000', 'gzip'],
        ['gzip, identity;q=bogus', 'gzip'],
      ] as const) {
        const headers = new Headers({ 'content-type': 'text/plain' })
        if (knownLength)
          headers.set('content-length', '5')
        const response = await applyResponseCompression(new Response('small', { headers }), request(offer))
        expect(response.status).toBe(200)
        expect(response.headers.get('content-encoding')).toBe(encoding)
        expect(response.headers.get('vary')).toContain('Accept-Encoding')
        expect(await new Response(response.body!.pipeThrough(new DecompressionStream(encoding))).text()).toBe('small')
      }
    }
  })

  test('retains identity when a specific offer overrides a wildcard refusal', async () => {
    for (const offer of ['*;q=0, identity', 'gzip, identity;q=0.1', 'gzip, not-identity;q=0', 'gzip, *;q=0.1']) {
      const original = new Response('small', { headers: { 'content-type': 'text/plain', 'content-length': '5' } })
      const response = applyResponseCompression(original, request(offer))
      expect(response).toBe(original)
      expect(await original.text()).toBe('small')
    }
  })

  test('rejects unavailable representations without retaining their metadata', async () => {
    for (const offer of ['identity;q=0', '*;q=0', 'gzip;q=0, deflate;q=0, identity;q=0', 'br, identity;q=0']) {
      let canceled = false
      const original = new Response(new ReadableStream({ cancel() { canceled = true } }), {
        headers: {
          'content-type': 'text/plain',
          'content-length': '2048',
          'content-disposition': 'attachment; filename=original.txt',
          'content-range': 'bytes 0-2047/4096',
          etag: '"original"',
          'last-modified': 'Tue, 08 Sep 2026 00:00:00 GMT',
          'content-digest': 'sha-256=:original:',
          'repr-digest': 'sha-256=:original:',
          'cache-control': 'public, max-age=31536000, immutable',
          expires: 'Tue, 08 Sep 2027 00:00:00 GMT',
          vary: 'Origin',
          'x-request-id': 'identity-refusal-test',
          'x-content-type-options': 'nosniff',
          'set-cookie': 'session=retained; HttpOnly',
        },
      })
      const response = await applyResponseCompression(original, request(offer))
      expect(response.status).toBe(406)
      expect(await response.text()).toBe('')
      expect(canceled).toBe(true)
      for (const header of ['content-type', 'content-length', 'content-encoding', 'content-range', 'content-disposition', 'etag', 'last-modified', 'content-digest', 'repr-digest', 'expires'])
        expect(response.headers.has(header)).toBe(false)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(response.headers.get('vary')).toBe('Origin, Accept-Encoding')
      expect(response.headers.get('x-request-id')).toBe('identity-refusal-test')
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      expect(response.headers.get('set-cookie')).toBe('session=retained; HttpOnly')
    }
  })

  test('rejects excluded content and ranges without buffering their streams', async () => {
    for (const [contentType, status] of [['text/event-stream', 200], ['image/png', 200], ['text/plain', 206]] as const) {
      let canceled = false
      const source = new ReadableStream({
        pull() { throw new Error('excluded content must not be read') },
        cancel() { canceled = true },
      }, { highWaterMark: 0 })
      const response = await applyResponseCompression(new Response(source, { status, headers: { 'content-type': contentType } }), request('gzip, identity;q=0'))
      expect(response.status).toBe(406)
      expect(canceled).toBe(true)
      expect(await response.text()).toBe('')
    }
  })

  /**
   * A 204 has no representation, so nothing about it varies by
   * `Accept-Encoding`; a 304 carries the `Vary` of the representation it
   * refreshes, and dropping an entry there is how a revalidating cache picks
   * the wrong stored copy.
   *
   * The case this shows up in is a CORS preflight, where the header would
   * otherwise read `Origin, Access-Control-Request-Method,
   * Access-Control-Request-Headers, Accept-Encoding` - three real dimensions
   * of the answer and one that is not.
   */
  test('advertises Accept-Encoding on a 304 but not on a representation-less 204', async () => {
    const vary = async (response: Response): Promise<string | null> =>
      (await applyResponseCompression(response, request('gzip'))).headers.get('vary')

    const preflight = new Response(null, {
      status: 204,
      headers: { vary: 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers' },
    })
    expect(await vary(preflight)).toBe('Origin, Access-Control-Request-Method, Access-Control-Request-Headers')
    expect(await vary(new Response(null, { status: 204 }))).toBeNull()
    expect(await vary(new Response(null, { status: 304, headers: { 'content-type': 'text/plain' } })))
      .toBe('Accept-Encoding')
  })

  test('preserves bodyless, caller-encoded and explicitly disabled responses', () => {
    for (const status of [204, 304]) {
      const response = new Response(null, { status, headers: { 'content-type': 'text/plain' } })
      expect(applyResponseCompression(response, request('*;q=0'))).toBe(response)
    }
    const empty = new Response(null, { headers: { 'content-type': 'text/plain' } })
    expect(applyResponseCompression(empty, request('*;q=0'))).toBe(empty)
    const encoded = new Response('caller bytes', { headers: { 'content-encoding': 'custom' } })
    expect(applyResponseCompression(encoded, request('*;q=0'))).toBe(encoded)
    const disabled = new Response('disabled', { headers: { 'content-type': 'text/plain' } })
    expect(applyResponseCompression(disabled, request('*;q=0'), { enabled: false })).toBe(disabled)
  })

  test('retains the empty rejection when the abandoned producer fails cancellation', async () => {
    const original = new Response(new ReadableStream({
      cancel() { return Promise.reject(new Error('producer cleanup failed')) },
    }, { highWaterMark: 0 }), { headers: { 'content-type': 'text/plain' } })
    const response = await applyResponseCompression(original, request('*;q=0'))
    expect(response.status).toBe(406)
    expect(await response.text()).toBe('')
  })
})
