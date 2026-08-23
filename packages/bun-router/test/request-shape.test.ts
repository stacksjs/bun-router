/**
 * A test request has to be the shape a real request has.
 *
 * `request.cookies` was built in four places - the router, the server's macro
 * accessor, `testing/test-request`, `testing/auth-testing` - and only the
 * server's was the real thing. The other three were plain method bags, so a
 * handler written against a live request (`req.cookies()`, `req.cookies.session`)
 * broke the moment a test handed it a mock. `request.ip` had the mirror-image
 * problem: a function on the server, a plain string in the test builder, and
 * declared as a string, so the declaration matched the shape production never
 * produces.
 *
 * These pin both shapes to each other. A regression here is a test suite that
 * passes against something no user ever receives.
 */

import { describe, expect, it } from 'bun:test'
import { Router } from '../src/router'
import { createMockRequest, TestRequestBuilder } from '../src/testing/test-request'

async function realRequest(headers: Record<string, string> = {}): Promise<any> {
  const router = new Router()
  let captured: any

  router.get('/shape', (req) => {
    captured = req
    return new Response('ok')
  })

  await router.handleRequest(new Request('http://localhost/shape', { headers }))
  return captured
}

describe('request.cookies is one shape everywhere', () => {
  it('is callable on a real request', async () => {
    const req = await realRequest({ cookie: 'session=abc; theme=dark' })

    expect(typeof req.cookies).toBe('function')
    expect(req.cookies()).toEqual({ session: 'abc', theme: 'dark' })
  })

  it('is callable on a mock request too', () => {
    const req: any = createMockRequest('GET', '/shape', { cookies: { session: 'abc' } })

    expect(typeof req.cookies).toBe('function')
    expect(req.cookies()).toEqual({ session: 'abc' })
  })

  it('carries the entries directly, on both', async () => {
    const real = await realRequest({ cookie: 'session=abc' })
    const mock: any = createMockRequest('GET', '/shape', { cookies: { session: 'abc' } })

    expect(real.cookies.session).toBe('abc')
    expect(mock.cookies.session).toBe('abc')
  })

  it('carries get/getAll, on both', async () => {
    const real = await realRequest({ cookie: 'session=abc' })
    const mock: any = createMockRequest('GET', '/shape', { cookies: { session: 'abc' } })

    expect(real.cookies.get('session')).toBe('abc')
    expect(mock.cookies.get('session')).toBe('abc')
    expect(real.cookies.getAll()).toEqual({ session: 'abc' })
    expect(mock.cookies.getAll()).toEqual({ session: 'abc' })
  })

  it('survives a cookie named after a function property', async () => {
    // `Object.assign` onto a function throws on these; `defineProperty` does not.
    const req = await realRequest({ cookie: 'name=n; length=3; caller=c' })

    expect(req.cookies.get('name')).toBe('n')
    expect(req.cookies.get('length')).toBe('3')
  })

  it('applies a mock set immediately, since there is no response to queue onto', () => {
    const req: any = createMockRequest('GET', '/shape', { cookies: {} })

    req.cookies.set('session', 'xyz')
    expect(req.cookies.get('session')).toBe('xyz')

    req.cookies.delete('session')
    expect(req.cookies.get('session')).toBeUndefined()
  })
})

describe('request.ip is one shape everywhere', () => {
  it('is a function on a real request', async () => {
    const req = await realRequest({ 'x-forwarded-for': '1.2.3.4' })

    expect(typeof req.ip).toBe('function')
    expect(req.ip()).toBe('1.2.3.4')
  })

  it('is a function on a mock request', () => {
    const req: any = createMockRequest()

    expect(typeof req.ip).toBe('function')
    expect(req.ip()).toBe('127.0.0.1')
  })

  it('is a function after the builder sets one', () => {
    const req: any = new TestRequestBuilder('GET', '/shape').ip('9.9.9.9').build()

    expect(typeof req.ip).toBe('function')
    expect(req.ip()).toBe('9.9.9.9')
  })
})
