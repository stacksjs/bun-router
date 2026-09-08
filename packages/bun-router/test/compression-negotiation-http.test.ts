import { expect, test } from 'bun:test'
import { Router } from '../src/router'

const body = 'Weighted encoding preferences preserve the response bytes. '.repeat(100)

for (const nativeRoutes of [false, true]) {
  test(`identity exclusion over HTTP (nativeRoutes=${nativeRoutes})`, async () => {
    const router = new Router()
    for (const knownLength of [false, true]) {
      router.get(`/small-${knownLength}`, () => new Response('small', {
        headers: {
          'content-type': 'text/plain',
          ...(knownLength ? { 'content-length': '5' } : {}),
          'x-request-id': 'identity-http-test',
          'x-content-type-options': 'nosniff',
          'set-cookie': 'identity=retained; HttpOnly',
        },
      }))
    }
    router.get('/events', () => new Response('data: small\n\n', { headers: { 'content-type': 'text/event-stream' } }))
    const server = await router.serve({ port: 0, nativeRoutes })
    try {
      for (const knownLength of [false, true]) {
        for (const [offer, expected, status] of [
          ['gzip, identity;q=0', 'gzip', 200],
          ['*;q=0, deflate', 'deflate', 200],
          ['gzip;q=0, deflate;q=0, identity;q=0', null, 406],
          ['*;q=0, identity', null, 200],
        ] as const) {
          const response = await fetch(`http://localhost:${server.port}/small-${knownLength}`, {
            headers: { 'accept-encoding': offer },
            decompress: false,
          })
          expect(response.status).toBe(status)
          expect(response.headers.get('content-encoding')).toBe(expected)
          expect(response.headers.get('vary')).toContain('Accept-Encoding')
          expect(response.headers.get('x-request-id')).toBe('identity-http-test')
          expect(response.headers.get('x-content-type-options')).toBe('nosniff')
          expect(response.headers.get('set-cookie')).toBe('identity=retained; HttpOnly')
          const decoded = expected
            ? new Response(response.body!.pipeThrough(new DecompressionStream(expected)))
            : response
          expect(await decoded.text()).toBe(status === 200 ? 'small' : '')
        }
      }
      const events = await fetch(`http://localhost:${server.port}/events`, { headers: { 'accept-encoding': 'gzip, identity;q=0' } })
      expect(events.status).toBe(406)
      expect(await events.text()).toBe('')
    }
    finally {
      server.stop(true)
    }
  })

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
