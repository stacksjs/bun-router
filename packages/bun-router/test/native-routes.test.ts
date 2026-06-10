import type { Server } from 'bun'
import type { EnhancedRequest } from '../src/types'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Router } from '../src/router'

/**
 * End-to-end coverage for `serve({ nativeRoutes: true })`: compatible
 * routes go through Bun's native router, while constrained routes,
 * 404/405, HEAD fallback and the OPTIONS preflight keep their fetch-path
 * semantics.
 */
describe('native routes (serve({ nativeRoutes: true }))', () => {
  let router: Router
  let server: Server<any>
  let base: string
  const middlewareHits: string[] = []

  beforeAll(async () => {
    router = new Router()

    router.use(async (req: EnhancedRequest, next) => {
      middlewareHits.push(new URL(req.url).pathname)
      return next()
    })

    router.get('/plain', () => new Response('plain'))
    router.get('/users/{id}', (req: EnhancedRequest) => Response.json({ id: req.params.id }))
    router.post('/users', () => new Response('created', { status: 201 }))
    router.get('/files/*', (req: EnhancedRequest) => new Response(`wild:${req.params.wildcard}`))
    router.get('/cookie', (req: EnhancedRequest) => {
      ;(req.cookies as any).set('seen', 'yes')
      return new Response('ok')
    })
    // Constrained route — must stay on the fetch matcher
    router.get('/orders/{id}', (req: EnhancedRequest) => new Response(`order:${req.params.id}`))
    ;(router as any).where({ id: '\\d+' })

    server = await (router as any).serve({ port: 0, nativeRoutes: true })
    base = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop(true)
  })

  it('serves static and param routes natively with extracted params', async () => {
    expect(await (await fetch(`${base}/plain`)).text()).toBe('plain')
    expect(await (await fetch(`${base}/users/42`)).json()).toEqual({ id: '42' })
  })

  it('runs global middleware on natively-matched routes', async () => {
    middlewareHits.length = 0
    await fetch(`${base}/plain`)
    expect(middlewareHits).toContain('/plain')
  })

  it('exposes the wildcard remainder like the fetch matcher', async () => {
    expect(await (await fetch(`${base}/files/a/b.txt`)).text()).toBe('wild:a/b.txt')
  })

  it('applies queued cookies to native responses', async () => {
    const res = await fetch(`${base}/cookie`)
    expect(res.headers.get('set-cookie')).toContain('seen=yes')
  })

  it('answers HEAD via the GET route', async () => {
    const res = await fetch(`${base}/plain`, { method: 'HEAD' })
    expect(res.status).toBe(200)
  })

  it('keeps 405 + Allow semantics through the fetch fallback', async () => {
    const res = await fetch(`${base}/plain`, { method: 'PUT' })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toContain('GET')
  })

  it('keeps enriched 404s through the fetch fallback', async () => {
    const res = await fetch(`${base}/nope`)
    expect(res.status).toBe(404)
    const body = await res.json() as { path: string }
    expect(body.path).toBe('/nope')
  })

  it('still enforces where() constraints (route excluded from native table)', async () => {
    expect(await (await fetch(`${base}/orders/123`)).text()).toBe('order:123')
    // Non-numeric id must not match the constrained route
    expect((await fetch(`${base}/orders/abc`)).status).toBe(404)
  })

  it('answers the generic OPTIONS preflight for unregistered paths', async () => {
    const res = await fetch(`${base}/users/42`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://app.example' },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example')
  })
})
