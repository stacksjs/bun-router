/**
 * The typed client against a real server.
 *
 * Types alone cannot catch a route that lies about its own response, so this
 * boots the router, points the client at it, and checks that what arrives
 * matches what the type promised.
 */

import type { EnhancedRequest } from '../src/types'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Router } from '../src/router'
import { createTypedClient, createTypedRouter, TypedClientError } from '../src/typed'

let server: ReturnType<Router['serve']> extends Promise<infer S> ? S : any
let port = 0
let api: any

beforeAll(async () => {
  const router = new Router()

  api = createTypedRouter(router)
    .get('/projects', () => ({ projects: [{ id: 1, name: 'apollo' }] }))
    .get('/projects/{id}', (req: EnhancedRequest) => ({ id: Number(req.params.id), name: 'apollo' }))
    .get('/echo/{id}', (req: EnhancedRequest) => ({ id: req.params.id }))
    .get('/search', (req: EnhancedRequest) => {
      const search = new URL(req.url).searchParams
      return { q: search.get('q'), page: search.get('page') }
    })
    .get('/whoami', (req: EnhancedRequest) => ({ token: req.headers.get('x-token') }))
    .post('/projects', async (req: EnhancedRequest) => ({ echoed: await req.json() }))
    .post('/refuse', () => new Response(JSON.stringify({ message: 'nope' }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    }))
    .delete('/projects/{id}', () => null)

  server = await router.serve({ port: 0, hostname: '127.0.0.1' })
  port = Number((server as any).port)
})

afterAll(() => {
  ;(server as any)?.stop?.()
})

function client(extra: Record<string, unknown> = {}) {
  return createTypedClient<typeof api>({ baseUrl: `http://127.0.0.1:${port}`, ...extra })
}

describe('createTypedClient', () => {
  it('returns the shape the handler returned', async () => {
    expect(await client().get('/projects')).toEqual({ projects: [{ id: 1, name: 'apollo' }] })
  })

  it('substitutes brace-form path params', async () => {
    expect(await client().get('/projects/{id}', { params: { id: '42' } }))
      .toEqual({ id: 42, name: 'apollo' })
  })

  it('percent-encodes a param rather than letting it address another route', async () => {
    // Left raw, the slashes here would make this a different path entirely, so
    // the client encodes them and the value arrives HERE, as one segment.
    //
    // It arrives with its original value, too: the client encodes, the router
    // decodes, and the param round-trips. This used to assert the encoded form
    // came out the other side, because the router did not decode at all and the
    // caller was handed `7%2F..%2F1` to deal with.
    expect(await client().get('/echo/{id}', { params: { id: '7/../1' } }))
      .toEqual({ id: '7/../1' })
  })

  it('appends query parameters', async () => {
    expect(await client().get('/search', { query: { q: 'apollo', page: 2 } }))
      .toEqual({ q: 'apollo', page: '2' })
  })

  it('drops undefined query values instead of sending the string "undefined"', async () => {
    expect(await client().get('/search', { query: { q: 'apollo', page: undefined } }))
      .toEqual({ q: 'apollo', page: null })
  })

  it('sends a JSON body', async () => {
    expect(await client().post('/projects', { name: 'apollo' }))
      .toEqual({ echoed: { name: 'apollo' } })
  })

  it('hands a 204 back as undefined rather than choking on an empty body', async () => {
    expect(await client().delete('/projects/{id}', { params: { id: '1' } })).toBeUndefined()
  })

  it('throws a TypedClientError carrying the status and the parsed body', async () => {
    const attempt = client().post('/refuse', {})

    await expect(attempt).rejects.toBeInstanceOf(TypedClientError)
    await attempt.catch((error: TypedClientError) => {
      expect(error.status).toBe(422)
      expect(error.body).toEqual({ message: 'nope' })
      expect(error.message).toContain('nope')
    })
  })

  it('routes a refusal through onError when one is configured', async () => {
    const forgiving = client({ onError: (error: TypedClientError) => ({ failed: error.status }) })

    expect(await forgiving.post('/refuse', {})).toEqual({ failed: 422 } as any)
  })

  it('re-reads function headers per request, so a rotating token does not need a new client', async () => {
    let token = 'first'
    const rotating = client({ headers: () => ({ 'x-token': token }) })

    expect(await rotating.get('/whoami')).toEqual({ token: 'first' })
    token = 'second'
    expect(await rotating.get('/whoami')).toEqual({ token: 'second' })
  })

  it('hands back the Response itself through raw()', async () => {
    const response = await client().raw('GET', '/projects')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('json')
  })
})
