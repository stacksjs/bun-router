/**
 * Compressing what goes back, which nothing was doing.
 *
 * Static files have been served gzipped for a long time; every response a
 * *route* produced went out whole. A server-rendered page is the shape that
 * costs: the landing page of the application this was found in is 253 KB of
 * HTML and compresses to about a tenth of that, on every request, for every
 * visitor - and the same is true of any JSON list long enough to matter.
 *
 * Three rules:
 *
 * - **Only when the client asked.** `Accept-Encoding` decides, and `Vary` says
 *   so, because a cache that hands a gzipped body to a client that did not ask
 *   is a cache that breaks that client.
 * - **Only when it is worth it.** Below a kilobyte the header costs more than
 *   the saving, and already-compressed bytes (an image, a woff2, a zip) get
 *   bigger rather than smaller.
 * - **Never by buffering.** The body is piped through a `CompressionStream`
 *   rather than read into memory, so a response that streams keeps streaming:
 *   the diff manifest that sends a hundred files as they parse still arrives a
 *   file at a time, compressed. Buffering to compress would have turned this
 *   product's progressive render into a wait, which is a worse trade than the
 *   bytes are worth.
 *
 * A piped body has no length until it ends, so `Content-Length` comes off and
 * the response goes out chunked. That is the ordinary shape for a compressed
 * response and every client handles it; a browser showing a page as it arrives
 * is not waiting for a number.
 */

/** zlib's own range, so a level Bun would reject is a type error rather than a throw. */
export type CompressionLevel = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface CompressionOptions {
  /** Off turns the whole thing off, for a proxy that already compresses. */
  enabled?: boolean
  /**
   * Kept for callers that set it, and unused by the stream path.
   *
   * `CompressionStream` has no level knob - it is the platform's, at its own
   * default - and piping is what keeps a streamed response streaming. A level
   * would mean going back to buffering, which is the trade this deliberately
   * does not make.
   */
  level?: CompressionLevel
  /** Bodies below this many bytes are sent as they are. */
  threshold?: number
}

export const DEFAULT_COMPRESSION: Required<CompressionOptions> = {
  enabled: true,
  level: 6,
  threshold: 1024,
}

/**
 * Content types worth compressing.
 *
 * A prefix list rather than a regex over everything: `image/svg+xml` is text
 * and compresses well, `image/png` is already compressed and grows. When in
 * doubt the answer is no, because sending something slightly larger is a
 * wasted CPU cycle and a wasted byte, while failing to compress is only a
 * missed saving.
 */
export function isCompressible(contentType: string | null): boolean {
  if (!contentType)
    return false

  const type = contentType.split(';')[0]?.trim().toLowerCase() ?? ''

  /*
   * Never server-sent events.
   *
   * An event stream is a live channel: the point is that an event reaches the
   * reader the moment it happens. Compression holds bytes back until it has
   * something worth emitting, so a compressed event stream is a stream that
   * arrives in clumps - or, with a quiet channel, not until it closes.
   */
  if (type === 'text/event-stream')
    return false

  if (type.startsWith('text/'))
    return true

  return [
    'application/json',
    'application/ld+json',
    'application/manifest+json',
    'application/javascript',
    'application/x-javascript',
    'application/xml',
    'application/xhtml+xml',
    'application/rss+xml',
    'application/atom+xml',
    'application/graphql',
    'application/x-ndjson',
    'image/svg+xml',
  ].includes(type)
}

/**
 * The encoding to use, from what the client offered.
 *
 * gzip before deflate, and `q=0` respected - a client that says
 * `gzip;q=0` means it, and sending gzip anyway is how you get an unreadable
 * page in the one browser that asked.
 *
 * Brotli is not offered even though Bun can produce it: `Bun.gzipSync` is
 * synchronous and brotli is not, and a compression step that awaits inside the
 * response path is a different change from this one.
 */
export function negotiateEncoding(header: string | null): 'gzip' | 'deflate' | null {
  if (!header)
    return null

  const offers = new Map<string, number>()

  for (const part of header.split(',')) {
    const [name = '', ...parameters] = part.trim().split(';')
    const quality = parameters
      .map(parameter => /^\s*q=([\d.]+)\s*$/i.exec(parameter))
      .find(Boolean)

    offers.set(name.trim().toLowerCase(), quality ? Number(quality[1]) : 1)
  }

  const wanted = (name: string): boolean => (offers.get(name) ?? offers.get('*') ?? 0) > 0

  if (wanted('gzip'))
    return 'gzip'

  if (wanted('deflate'))
    return 'deflate'

  return null
}

/**
 * Whether this response should be compressed at all.
 *
 * `Content-Length` is a *hint here rather than a requirement*: Bun does not put
 * one on a `Response` built from a string, so treating its absence as "this is
 * a stream, leave it alone" left every server-rendered page uncompressed - the
 * exact case this exists for. When there is a length, it decides against
 * bodies too small to be worth it; when there is not, the body is piped and
 * the threshold cannot apply.
 */
export function shouldCompress(response: Response, encoding: string | null, threshold: number): boolean {
  if (!encoding)
    return false

  // 204 and 304 carry no body; 206 is a range somebody is reassembling.
  if (response.status === 204 || response.status === 304 || response.status === 206)
    return false

  if (response.headers.has('content-encoding'))
    return false

  if (!isCompressible(response.headers.get('content-type')))
    return false

  const length = Number(response.headers.get('content-length') ?? Number.NaN)
  // Reading Response.body can materialize a stream. A known short body does
  // not need one just to decide that it will be sent without compression.
  if (Number.isFinite(length) && !(length >= threshold))
    return false

  return Boolean(response.body)
}

/**
 * The response, compressed when that is the right thing to do.
 *
 * Returns the response it was given when it is not, so a caller can apply this
 * unconditionally at the end of the pipeline.
 */
export function applyResponseCompression(
  response: Response,
  request: Request,
  options: CompressionOptions = {},
): Response | Promise<Response> {
  const enabled = options.enabled ?? DEFAULT_COMPRESSION.enabled

  if (!enabled)
    return response

  const threshold = options.threshold ?? DEFAULT_COMPRESSION.threshold
  const acceptEncoding = request.headers.get('accept-encoding')
  const length = acceptEncoding ? Number(response.headers.get('content-length') ?? Number.NaN) : Number.NaN
  // A known short response cannot use any encoding, so avoid parsing the offers.
  const encoding = Number.isFinite(length) && !(length >= threshold) ? null : negotiateEncoding(acceptEncoding)

  if (!shouldCompress(response, encoding, threshold)) {
    /*
     * `Vary` even when nothing was compressed.
     *
     * The decision depends on a request header, so a cache that stores this
     * copy has to know it cannot serve it to a client that asked differently.
     * Adding it only on the compressed branch is the classic way to poison a
     * shared cache.
     */
    if (isCompressible(response.headers.get('content-type')) && !response.headers.has('content-encoding'))
      appendVary(response.headers, 'Accept-Encoding')

    return response
  }

  /*
   * Enough of the body to apply the threshold, and no more.
   *
   * Without a `Content-Length` the only way to know whether a body is worth
   * compressing is to look at some of it. Reading a kilobyte is not buffering
   * the response: a stream that carries on is handed back with its prefix
   * re-attached and keeps streaming, and one that ended inside the first
   * kilobyte was never a stream at all - it was a small answer that gzip would
   * have made bigger. `/api/health` is 356 bytes, and it was being compressed.
   */
  const known = Number(response.headers.get('content-length') ?? Number.NaN)
  if (!Number.isFinite(known))
    return compressUnknownLengthResponse(response, encoding as 'gzip' | 'deflate', threshold)

  return createCompressedResponse(
    response,
    response.body as ReadableStream<Uint8Array>,
    encoding as 'gzip' | 'deflate',
  )
}

/**
 * Preserve the original Promise-only public contract for direct callers.
 * The server uses `applyResponseCompression` so the usual uncompressed and
 * known-length paths do not create a second promise per request.
 */
export async function compressResponse(
  response: Response,
  request: Request,
  options: CompressionOptions = {},
): Promise<Response> {
  return applyResponseCompression(response, request, options)
}

async function compressUnknownLengthResponse(
  response: Response,
  encoding: 'gzip' | 'deflate',
  threshold: number,
): Promise<Response> {
  const body = await peekBody(response.body as ReadableStream<Uint8Array>, threshold)

  if (body.ended && body.size < threshold) {
    const headers = new Headers(response.headers)
    appendVary(headers, 'Accept-Encoding')

    return new Response(body.stream, { status: response.status, statusText: response.statusText, headers })
  }

  return createCompressedResponse(response, body.stream, encoding)
}

function createCompressedResponse(
  response: Response,
  body: ReadableStream<Uint8Array>,
  encoding: 'gzip' | 'deflate',
): Response {

  const headers = new Headers(response.headers)
  headers.set('Content-Encoding', encoding)
  appendVary(headers, 'Accept-Encoding')

  // The compressed length is not known until the body ends, and a wrong
  // `Content-Length` is a truncated page rather than a slow one.
  headers.delete('Content-Length')

  /*
   * Cast at the seam, and only here.
   *
   * `CompressionStream` is typed against the DOM's byte-stream pair and a
   * `Response` body against Bun's; they are the same object at runtime and the
   * two declarations disagree about the array-buffer parameter. Everything
   * around this line stays typed.
   */
  const compressed = (body as unknown as ReadableStream)
    .pipeThrough(new CompressionStream(encoding === 'gzip' ? 'gzip' : 'deflate') as unknown as ReadableWritablePair) as unknown as ReadableStream<Uint8Array>

  return new Response(compressed, { status: response.status, statusText: response.statusText, headers })
}

/**
 * Read up to `limit` bytes, and hand back a stream that still has them.
 *
 * The prefix is re-emitted before the rest of the source, so nothing is lost
 * and nothing is held beyond the limit. `ended` says the body finished inside
 * the prefix, which is what makes a small answer distinguishable from the
 * beginning of a large one.
 */
export async function peekBody(
  source: ReadableStream<Uint8Array>,
  limit: number,
): Promise<{ stream: ReadableStream<Uint8Array>, size: number, ended: boolean }> {
  const reader = source.getReader()
  const prefix: Uint8Array[] = []
  let size = 0
  let ended = false

  while (size < limit) {
    const { value, done } = await reader.read()

    if (done) {
      ended = true
      break
    }

    if (value) {
      prefix.push(value)
      size += value.byteLength
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of prefix)
        controller.enqueue(chunk)

      if (ended)
        controller.close()
    },
    async pull(controller) {
      if (ended)
        return

      const { value, done } = await reader.read()

      if (done) {
        ended = true
        controller.close()
        return
      }

      if (value)
        controller.enqueue(value)
    },
    cancel(reason) {
      // A reader who navigated away, which for this product means `git diff`
      // still running with nobody to read it.
      return reader.cancel(reason)
    },
  })

  return { stream, size, ended }
}

/** Add to `Vary` without dropping what is already there. */
export function appendVary(headers: Headers, value: string): void {
  const existing = headers.get('vary')

  if (!existing) {
    headers.set('Vary', value)
    return
  }

  const parts = existing.split(',').map(part => part.trim().toLowerCase())

  if (parts.includes('*') || parts.includes(value.toLowerCase()))
    return

  headers.set('Vary', `${existing}, ${value}`)
}
