/**
 * The runtime half of typed routes.
 *
 * The claim is that a route registered through `createTypedRouter()` is an
 * ordinary route - same table, same dispatch, same everything - and that only
 * the compiler can tell the difference. These check that. The compile-time half
 * is `typed-inference.test-d.ts`, which `bun run typecheck` checks.
 */

import type { EnhancedRequest } from '../src/types'
import { beforeEach, describe, expect, it } from 'bun:test'
import { Router } from '../src/router'
import { createTypedRouter } from '../src/typed'

describe('createTypedRouter', () => {
  let router: Router

  beforeEach(() => {
    router = new Router()
  })

  it('registers a plain function handler on the router it was given', async () => {
    createTypedRouter(router).get('/projects', () => ({ projects: ['apollo'] }))

    const response = await router.handleRequest(new Request('http://localhost/projects'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ projects: ['apollo'] })
  })

  it('registers an object handler with a handle() method', async () => {
    const action = {
      validations: { name: { rule: { test: (v: string) => typeof v === 'string', validate: () => ({ valid: true }) } } },
      handle: () => ({ ok: true }),
    }

    createTypedRouter(router).post('/projects', action)

    const response = await router.handleRequest(new Request('http://localhost/projects', { method: 'POST' }))

    expect(await response.json()).toEqual({ ok: true })
  })

  it('passes path params through untouched', async () => {
    createTypedRouter(router).get('/projects/{id}', (req: EnhancedRequest) => ({ id: req.params.id }))

    const response = await router.handleRequest(new Request('http://localhost/projects/42'))

    expect(await response.json()).toEqual({ id: '42' })
  })

  it('chains every method onto one table', async () => {
    createTypedRouter(router)
      .get('/a', () => ({ m: 'get' }))
      .post('/a', () => ({ m: 'post' }))
      .put('/a', () => ({ m: 'put' }))
      .patch('/a', () => ({ m: 'patch' }))
      .delete('/a', () => ({ m: 'delete' }))

    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await router.handleRequest(new Request('http://localhost/a', { method }))
      expect(await response.json()).toEqual({ m: method.toLowerCase() })
    }
  })

  it('returns the same builder object every call, so the chain is one router', () => {
    const typed = createTypedRouter(router)

    expect(typed.get('/x', () => ({}))).toBe(typed as any)
  })

  /**
   * The one that matters for security. An option that cannot be applied has to
   * be loud: a silently dropped `middleware: 'auth'` is an unprotected
   * endpoint that nobody was told about.
   */
  it('throws rather than dropping an option the route cannot take', () => {
    const registrar = {
      get: () => undefined,
      post: () => undefined,
      put: () => undefined,
      patch: () => undefined,
      delete: () => undefined,
    }

    expect(() => createTypedRouter(registrar).get('/x', () => ({}), { middleware: 'auth' }))
      .toThrow(/does not support \.middleware\(\)/)
  })

  it('applies options when the route can take them', () => {
    const applied: string[] = []
    const chainable = {
      middleware: (name: string) => applied.push(`middleware:${name}`),
      name: (routeName: string) => applied.push(`name:${routeName}`),
      skipCsrf: () => applied.push('skipCsrf'),
      rateLimit: (max: number, window: string | number) => applied.push(`rateLimit:${max}:${window}`),
    }
    const registrar = {
      get: () => chainable,
      post: () => chainable,
      put: () => chainable,
      patch: () => chainable,
      delete: () => chainable,
    }

    createTypedRouter(registrar).get('/x', () => ({}), {
      middleware: 'auth',
      name: 'x.show',
      skipCsrf: true,
      rateLimit: { max: 10 },
    })

    expect(applied).toEqual(['middleware:auth', 'name:x.show', 'skipCsrf', 'rateLimit:10:minute'])
  })
})
