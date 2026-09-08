import { expect, test } from 'bun:test'
import { Router } from '../src/router'

const body = 'Weighted encoding preferences preserve the response bytes. '.repeat(100)

for (const nativeRoutes of [false, true]) {
  test(`weighted response compression over HTTP (nativeRoutes=${nativeRoutes})`, async () => {
    const router = new Router()
    router.get('/weighted', () => new Response(body, { headers: { 'content-type': 'text/plain' } }))
    const server = await router.serve({ port: 0, nativeRoutes })
    try {
      for (const [offer, expected] of [
        ['gzip;q=0.2, deflate;q=0.8', 'deflate'],
        ['deflate;q=0.2, gzip;q=0.8', 'gzip'],
        ['gzip;q=0, *;q=0.8', 'deflate'],
        ['gzip;q=bogus, deflate', 'deflate'],
        ['gzip;q=0.2, identity;q=0.8', null],
      ] as const) {
        const response = await fetch(`http://localhost:${server.port}/weighted`, {
          headers: { 'accept-encoding': offer },
          decompress: false,
        })
        expect(response.status).toBe(200)
        expect(response.headers.get('content-encoding')).toBe(expected)
        expect(response.headers.get('vary')).toContain('Accept-Encoding')
        const decoded = expected
          ? new Response(response.body!.pipeThrough(new DecompressionStream(expected)))
          : response
        expect(await decoded.text()).toBe(body)
      }
    }
    finally {
      server.stop(true)
    }
  })
}
