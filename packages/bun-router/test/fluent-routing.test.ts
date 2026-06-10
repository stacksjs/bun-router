import type { EnhancedRequest } from '../src/types'
import { describe, expect, it } from 'bun:test'
import { FluentRouter, RouterUtils } from '../src/router/fluent-routing'
import { registerNamedRoute } from '../src/url'

const mkReq = (path: string, method = 'GET', headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { method, headers }) as EnhancedRequest

describe('FluentRouter (canonical)', () => {
  it('extracts path params with the same semantics as the main Router', async () => {
    const router = new FluentRouter()
    router.register(
      router.get('/users/{id}/posts/{postId}', req =>
        Response.json({ id: req.params.id, postId: req.params.postId })),
    )

    const res = await router.handle(mkReq('/users/42/posts/7'))
    expect(res).not.toBeNull()
    expect(await res!.json()).toEqual({ id: '42', postId: '7' })
  })

  it('does not let regex metacharacters in static segments over-match', async () => {
    const router = new FluentRouter()
    router.register(router.get('/api/v1.0/users', () => new Response('ok')))

    expect(await router.handle(mkReq('/api/v1.0/users'))).not.toBeNull()
    expect(await router.handle(mkReq('/api/v1X0/users'))).toBeNull()
  })

  it('matches optional params', async () => {
    const router = new FluentRouter()
    router.register(router.get('/posts/{slug?}', req =>
      new Response(req.params.slug ?? 'index')))

    expect(await (await router.handle(mkReq('/posts/hello')))!.text()).toBe('hello')
    expect(await (await router.handle(mkReq('/posts')))!.text()).toBe('index')
  })

  it('runs conditional middleware only when the condition holds', async () => {
    const router = new FluentRouter()
    const hits: string[] = []

    router.addConditionalMiddleware({
      condition: req => req.headers.get('x-flag') === 'on',
      middleware: [async (_req, next) => {
        hits.push('conditional')
        return next()
      }],
    })
    router.register(router.get('/thing', () => new Response('ok')))

    await router.handle(mkReq('/thing'))
    expect(hits).toEqual([])

    await router.handle(mkReq('/thing', 'GET', { 'x-flag': 'on' }))
    expect(hits).toEqual(['conditional'])
  })

  it('generates URLs from the shared named-route registry', () => {
    registerNamedRoute('fluent.users.show', '/users/{id}')
    expect(RouterUtils.route('fluent.users.show', { id: '9' })).toBe('/users/9')
    expect(RouterUtils.route('fluent.users.show', { id: '9' }, { tab: 'posts' }))
      .toBe('/users/9?tab=posts')
    // Unregistered names keep the legacy fallback
    expect(RouterUtils.route('never-registered')).toBe('/never-registered')
  })
})
