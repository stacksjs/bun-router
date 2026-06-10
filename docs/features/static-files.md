# Static File Serving

bun-router ships a high-performance static file server built on `Bun.file()`. It caches small files in memory (optionally gzip-compressed), streams large files straight from disk with HTTP Range support, handles conditional requests with ETag and Last-Modified headers, and protects against directory traversal out of the box.

> **Note:** The static file server is not re-exported from the package index. Import it from the `file-serving/static-files` subpath:
>
> ```typescript
> import { createStaticFileMiddleware, StaticFileServer } from 'bun-router/file-serving/static-files'
> ```

## Basic Usage

The quickest way to serve a directory is the middleware factory, which plugs directly into `router.use()`:

```typescript
import { Router } from 'bun-router'
import { createStaticFileMiddleware } from 'bun-router/file-serving/static-files'

const router = new Router()

router.use(createStaticFileMiddleware({
  root: './public',
}))
```

The middleware:

- Only handles `GET` and `HEAD` requests — everything else is passed to the next handler
- Answers `HEAD` requests with the same status and headers but no body
- Falls through to your routes when no file matches (with the default `fallthrough: true`)

Request paths map directly onto `root`: a request for `/css/app.css` is served from `./public/css/app.css`. The middleware does not strip a URL prefix, so mount it for the whole site rather than under a sub-path.

## Using StaticFileServer Directly

For more control, instantiate `StaticFileServer` yourself and call `serve(request)`. It returns a `Response`, or `null` when the file was not found and `fallthrough` is enabled:

```typescript
import { StaticFileServer } from 'bun-router/file-serving/static-files'

const files = new StaticFileServer({ root: './public' })

router.get('/assets/*', async (req) => {
  const response = await files.serve(req)
  return response ?? new Response('Not Found', { status: 404 })
})
```

## Configuration Options

All options of `StaticFileConfig` (only `root` is required):

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `root` | `string` | — | Directory to serve files from |
| `maxAge` | `number` | `86400` (1 day) | `max-age` in seconds for the generated `Cache-Control` header |
| `immutable` | `boolean` | `false` | Append `immutable` to the generated `Cache-Control` header |
| `etag` | `boolean` | `true` | Set `ETag` and honor `If-None-Match` (in-memory cached files) |
| `lastModified` | `boolean` | `true` | Set `Last-Modified` and honor `If-Modified-Since` |
| `index` | `string[]` | `['index.html', 'index.htm']` | Index files tried when a directory is requested |
| `extensions` | `string[]` | `[]` | Extensions appended when the exact path does not exist (e.g. `['.html']` lets `/about` serve `about.html`) |
| `fallthrough` | `boolean` | `true` | Return `null` on a miss so the next handler runs, instead of responding `404` |
| `setHeaders` | `(res, path, stat) => void` | no-op | Callback invoked per served file |
| `compression` | `boolean` | `true` | Cache a gzip variant for compressible files |
| `compressionThreshold` | `number` | `1024` | Minimum file size in bytes before compression is attempted |
| `cacheControl` | `string` | `''` | Explicit `Cache-Control` header; overrides `maxAge`/`immutable` when set |
| `dotfiles` | `'allow' \| 'deny' \| 'ignore'` | `'ignore'` | Policy for paths containing `/.` (see [Security](#security)) |
| `maxCacheFileSize` | `number` | `5242880` (5 MiB) | Files larger than this are streamed from disk instead of cached in memory |

## Conditional Requests (ETag / 304)

For files served from the in-memory cache, the server generates a strong ETag from a hash of the file content plus its modification time. When the client sends a matching `If-None-Match`, or an `If-Modified-Since` matching the file's `Last-Modified`, a `304 Not Modified` is returned with no body:

```typescript
const files = new StaticFileServer({
  root: './public',
  etag: true, // default
  lastModified: true, // default
})
```

The compressed and uncompressed variants of a file have distinct ETags, so revalidation stays correct regardless of `Accept-Encoding`.

Large files that bypass the cache (see below) use `Last-Modified`/`If-Modified-Since` for revalidation; they do not get an ETag.

## Large Files: Streaming and Range Requests

Files larger than `maxCacheFileSize` (default 5 MiB) are never buffered into memory. They are streamed straight from disk via `Bun.file()` and advertise `Accept-Ranges: bytes`, so video seeking and resumable downloads work:

```typescript
const files = new StaticFileServer({
  root: './media',
  maxCacheFileSize: 10 * 1024 * 1024, // stream anything over 10 MiB
})
```

Single-range `Range` headers are supported in all three forms:

- `bytes=0-1023` — explicit start and end
- `bytes=1024-` — from an offset to the end of the file
- `bytes=-500` — the last 500 bytes (suffix range)

Valid ranges are answered with `206 Partial Content` plus `Content-Range` and an exact `Content-Length`. Unsatisfiable ranges (start past the end of the file) get `416 Range Not Satisfiable` with `Content-Range: bytes */<size>`. Multipart (multi-range) requests are not supported; they receive the full file with `200`.

## Compression

When `compression` is enabled (the default), files at or above `compressionThreshold` bytes are gzipped once and the compressed copy is stored alongside the original in the cache. The gzip variant is only kept if it is actually smaller than the original.

On each request the server picks the variant based on the client's `Accept-Encoding`; compressed responses carry `Content-Encoding: gzip` and `Vary: Accept-Encoding`. Files streamed from disk (above `maxCacheFileSize`) are never compressed.

## Cache Behavior and Invalidation

Small files are cached in memory after the first request, keyed by file path. On every subsequent request the file's `Last-Modified` time is checked against the cache entry, so an edited file is automatically re-read — the cache can never serve stale content after a change, it just costs one re-read.

Cache management methods on `StaticFileServer`:

```typescript
// Drop everything
files.clearCache()

// Drop a single file, leaving the rest of the cache warm
files.invalidateFile('/path/to/public/css/app.css')

// Total bytes held in memory (originals + compressed variants)
const bytes = files.getCacheSize()

// Warm the cache ahead of traffic (paths are URL paths relative to root)
await files.preloadFiles(['/index.html', '/css/app.css', '/js/app.js'])
```

### File Watcher

`FileServingUtils.createFileWatcher` wires a recursive `fs.watch` to the cache. Change events are debounced (100 ms) and invalidated per file, so a burst of writes — a build emitting output, a `git checkout` — does not repeatedly flush the whole cache. Events that arrive without a filename fall back to a full `clearCache()`:

```typescript
import { FileServingUtils, StaticFileServer } from 'bun-router/file-serving/static-files'

const files = new StaticFileServer({ root: './public' })
const watcher = await FileServingUtils.createFileWatcher(files, './public')

// Later, on shutdown
watcher.close()
```

## Preset Servers

`StaticFileHelpers` provides factories with sensible presets layered over your config:

```typescript
import { StaticFileHelpers } from 'bun-router/file-serving/static-files'

// Development: no caching headers (maxAge: 0), no ETag, no compression
const dev = StaticFileHelpers.createDevelopmentServer({ root: './public' })

// Production: 1-year max-age, immutable, compression from 512 bytes
const prod = StaticFileHelpers.createProductionServer({ root: './dist' })

// SPA: no fallthrough, index.html only
const spa = StaticFileHelpers.createSPAServer({ root: './dist' })

// CDN: 30-day max-age plus explicit s-maxage Cache-Control
const cdn = StaticFileHelpers.createCDNServer({ root: './assets' })
```

## Statistics

Per-path serving metrics are tracked automatically and available via `getStats()`:

```typescript
router.get('/admin/static-stats', () => {
  return Response.json(files.getStats())
})
```

Each entry is a `FileStats` record: `hits` (304 revalidations), `misses` (full responses), `bytesServed`, `compressionRatio`, `averageResponseTime` (ms), and `lastAccessed` (timestamp).

## Security

The server defends against path traversal before touching the filesystem:

- The pathname is percent-decoded first, so encoded payloads like `%2e%2e` are caught too; malformed encodings return `400 Bad Request`
- Paths containing `..`, null bytes, or backslashes are rejected with `403 Forbidden`

Dotfiles (any path segment starting with `.`, such as `/.env` or `/.git/config`) are governed by the `dotfiles` option:

- `'ignore'` (default) — treated as if the file does not exist
- `'deny'` — respond `403 Forbidden`
- `'allow'` — serve them like any other file

For extra hardening, `FileServingUtils.generateSecurityHeaders()` returns a set of recommended headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`) you can apply to your responses.

`FileServingUtils.getOptimalCacheSettings(filePath)` is also available to suggest `maxAge`/`immutable`/`compression` settings per file type (long-lived for fonts and JS/CSS, shorter for images and HTML).

## Next Steps

Now that you understand static file serving in bun-router, check out these related topics:

- [File Streaming](/features/file-streaming) - Stream individual files with custom headers and range support
- [Response Caching](/features/response-caching) - Cache dynamic responses, not just files
- [Middleware](/features/middleware) - Combine static serving with authentication or logging
