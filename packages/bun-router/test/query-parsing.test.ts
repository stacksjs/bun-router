import type { EnhancedRequest } from '../src/types'
import { describe, expect, test } from 'bun:test'
import { getParsedQuery, getParsedURL } from '../src/request/macros'
import { Router } from '../src/router'

function request(url = 'https://example.test/query'): EnhancedRequest {
  return new Request(url) as EnhancedRequest
}

describe('lazy query parsing', () => {
  test('caches a distinct empty query per request without materializing a URL', () => {
    const first = request()
    const second = request()
    const query = getParsedQuery(first)
    expect(query).toEqual({})
    expect(Object.hasOwn(first, '_parsedURL')).toBe(false)
    expect(getParsedQuery(first)).toBe(query)
    expect(getParsedQuery(second)).not.toBe(query)
    query.local = 'first'
    expect(getParsedQuery(first)).toEqual({ local: 'first' })
    expect(getParsedQuery(second)).toEqual({})
  })

  test('honors edits to a URL parsed before the first query access', () => {
    const req = request()
    getParsedURL(req).searchParams.append('added', 'one')
    getParsedURL(req).searchParams.append('added', 'two')
    expect(getParsedQuery(req)).toEqual({ added: ['one', 'two'] })
    getParsedURL(req).searchParams.set('added', 'later')
    expect(getParsedQuery(req)).toEqual({ added: ['one', 'two'] })
  })

  test.each([
    ['', {}],
    ['?', {}],
    ['#fragment?ignored=yes', {}],
    ['?name=hello+world&name=caf%C3%A9&empty=', { name: ['hello world', 'café'], empty: '' }],
    ['?q=%3Fvalue%23tail#ignored=1', { q: '?value#tail' }],
    ['?q=%ZZ&bare', { q: '%ZZ', bare: '' }],
  ])('keeps URL query semantics for %s', (suffix, expected) => {
    expect(getParsedQuery(request(`https://example.test/query${suffix}`))).toEqual(expected)
  })
})

for (const nativeRoutes of [false, true]) {
  describe(`query access over HTTP with nativeRoutes=${nativeRoutes}`, () => {
    test('preserves empty, repeated, decoded and explicitly overridden queries', async () => {
      const router = new Router()
      router.get('/query', req => Response.json(req.query))
      router.get('/override', (req) => {
        req.query = { supplied: 'by middleware' }
        return Response.json(req.query)
      })
      const server = await router.serve({ port: 0, nativeRoutes })
      try {
        const base = `http://localhost:${server.port}`
        for (const [suffix, expected] of [
          ['', {}],
          ['?', {}],
          ['?name=hello+world&name=caf%C3%A9&empty=', { name: ['hello world', 'café'], empty: '' }],
        ] as const) {
          const response = await fetch(`${base}/query${suffix}`)
          expect(response.status).toBe(200)
          expect(await response.json()).toEqual(expected)
        }
        const response = await fetch(`${base}/override`)
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ supplied: 'by middleware' })
      }
      finally {
        server.stop(true)
      }
    })
  })
}
