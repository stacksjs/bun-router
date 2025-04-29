import type { Router } from './core'
import { stat } from 'node:fs/promises'

/**
 * File streaming extension for Router class
 */
export function registerFileStreaming(RouterClass: typeof Router): void {
  Object.defineProperties(RouterClass.prototype, {
    /**
     * Stream a file as a response
     */
    streamFile: {
      value(
        path: string,
        options?: { headers?: Record<string, string>, status?: number },
      ): Response {
        const file = Bun.file(path)
        const headers = new Headers()

        // Set content type based on file extension
        headers.set('Content-Type', file.type)

        // Add custom headers if provided
        if (options?.headers) {
          for (const [key, value] of Object.entries(options.headers)) {
            headers.set(key, value)
          }
        }

        return new Response(file, {
          status: options?.status || 200,
          headers,
        })
      },
      writable: true,
      configurable: true,
    },

    /**
     * Stream a file with range support (for video/audio streaming)
     */
    streamFileWithRanges: {
      async value(path: string, req: Request): Promise<Response> {
        const fileInfo = await stat(path)
        const fileSize = fileInfo.size

        const range = req.headers.get('range')
        if (!range) {
          // No range requested, serve the entire file
          return this.streamFile(path)
        }

        // Parse the range header
        const rangeMatch = range.match(/bytes=(\d+)-(\d*)/)
        if (!rangeMatch) {
          // Invalid range header
          return new Response('Invalid range header', { status: 416 })
        }

        const start = Number.parseInt(rangeMatch[1], 10)
        const end = rangeMatch[2] ? Number.parseInt(rangeMatch[2], 10) : fileSize - 1

        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          // Range not satisfiable
          return new Response('Range not satisfiable', { status: 416 })
        }

        // Create file stream with the specified range
        const file = Bun.file(path)
        const slice = file.slice(start, end + 1)

        const headers = new Headers()
        headers.set('Content-Type', file.type)
        headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Content-Length', String(end - start + 1))

        return new Response(slice, {
          status: 206, // Partial Content
          headers,
        })
      },
      writable: true,
      configurable: true,
    },

    /**
     * Register a health check route
     */
    health: {
      async value(): Promise<Router> {
        await this.get('/health', () => {
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              'Content-Type': 'application/json',
            },
          })
        })

        return this
      },
      writable: true,
      configurable: true,
    },
  })
}
