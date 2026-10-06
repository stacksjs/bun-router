import { describe, expect, it } from 'bun:test'
import { parseBearerToken } from '../src/request/bearer'
import { Router } from '../src/router/router'

/**
 * The Bearer scheme is case-insensitive.
 *
 * Every reader of the Authorization header tested `startsWith('Bearer ')`, so
 * `bearer abc` carried no token - while a CSRF check reading the same header
 * case-insensitively treated the request as token-authenticated and exempt,
 * and it then authenticated by its cookie instead.
 */
describe('parseBearerToken', () => {
  it.each([
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
    ['BEARER abc', 'abc'],
    ['Bearer   abc', 'abc'],
    ['  Bearer abc  ', 'abc'],
  ])('reads %p', (header, token) => {
    expect(parseBearerToken(header)).toBe(token)
  })

  it.each([null, '', 'Bearer', 'Bearer ', 'Basic abc', 'Bearerabc'])('finds no token in %p', (header) => {
    expect(parseBearerToken(header)).toBeNull()
  })

  it('is what request.bearerToken() returns', async () => {
    const router = new Router()
    let seen: string | null | undefined
    router.get('/t', (req: any) => {
      seen = req.bearerToken()
      return new Response('ok')
    })
    await router.handleRequest(new Request('http://localhost/t', { headers: { authorization: 'bearer lower' } }))
    expect(seen).toBe('lower')
  })
})
