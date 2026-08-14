/**
 * Compressing what goes back, which nothing was doing.
 *
 * Static files have been served gzipped for a long time; every response a
 * *route* produced went out whole. A server-rendered page is the shape that
 * costs: the landing page of the application this was found in is 253 KB of
 * HTML and compresses to about a tenth of that, on every request, for every
 * visitor - and the same is true of any JSON list long enough to matter.
 *
 * Three rules, and the middle one is the important one:
 *
 * - **Only when the client asked.** `Accept-Encoding` decides, and `Vary` says
 *   so, because a cache that hands a gzipped body to a client that did not ask
 *   is a cache that breaks that client.
 * - **Only when the length is known.** A response with no `Content-Length` is a
 *   stream, and buffering one to compress it would turn a progressive render
 *   into a wait - the diff manifest that streams a hundred files as they parse
 *   would arrive all at once, at the end. Streams are left alone.
 * - **Only when it is worth it.** Below a kilobyte the header costs more than
 *   the saving, and already-compressed bytes (an image, a woff2, a zip) get
 *   bigger rather than smaller.
 */

/** zlib's own range, so a level Bun would reject is a type error rather than a throw. */
export type CompressionLevel = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface CompressionOptions {
  /** Off turns the whole thing off, for a proxy that already compresses. */
  enabled?: boolean
  /** zlib level. 6 is the usual balance; 9 costs noticeably more CPU for a few percent. */
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

/** Whether this response should be compressed at all, and why not when it should not. */
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

  // No length means a stream. Buffering it to compress would turn a
  // progressive render into a wait, which is a worse trade than the bytes.
  if (!Number.isFinite(length))
    return false

  return length >= threshold
}

/**
 * The response, compressed when that is the right thing to do.
 *
 * Returns the response it was given when it is not, so a caller can apply this
 * unconditionally at the end of the pipeline.
 */
export async function compressResponse(
  response: Response,
  request: Request,
  options: CompressionOptions = {},
): Promise<Response> {
  const settings = { ...DEFAULT_COMPRESSION, ...options }

  if (!settings.enabled)
    return response

  const encoding = negotiateEncoding(request.headers.get('accept-encoding'))

  if (!shouldCompress(response, encoding, settings.threshold)) {
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

  const body = new Uint8Array(await response.arrayBuffer())

  const compressed = encoding === 'gzip'
    ? Bun.gzipSync(body, { level: settings.level })
    : Bun.deflateSync(body, { level: settings.level })

  // Compressing can grow a body that was already dense. Sending the original
  // then, rather than a larger one with an extra header.
  if (compressed.byteLength >= body.byteLength) {
    const headers = new Headers(response.headers)
    appendVary(headers, 'Accept-Encoding')

    return new Response(body, { status: response.status, statusText: response.statusText, headers })
  }

  const headers = new Headers(response.headers)
  headers.set('Content-Encoding', encoding as string)
  headers.set('Content-Length', String(compressed.byteLength))
  appendVary(headers, 'Accept-Encoding')

  return new Response(compressed, { status: response.status, statusText: response.statusText, headers })
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
