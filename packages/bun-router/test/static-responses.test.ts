import type { Server } from 'bun'
import { afterEach, describe, expect, it } from 'bun:test'
import { Router } from '../src/router'

describe('static response routes', () => {
  let server: Server<unknown> | undefined

  afterEach(() => {
    server?.stop(true)
    server = undefined
  })

  it('keeps a prebuilt response scoped to its HTTP method', async () => {
    const router = new Router()
    const internals = router as Router & { handleRequestImpl: (request: Request) => Promise<Response> }
    const originalHandleRequest = internals.handleRequestImpl.bind(router)
    let fetchHits = 0
    internals.handleRequestImpl = (request: Request) => {
      fetchHits++
      return originalHandleRequest(request)
    }
    router.post('/ready', new Response('posted'))
    server = await router.serve({ port: 0 })
    const base = `http://127.0.0.1:${server.port}`

    const getResponse = await fetch(`${base}/ready`)
    expect(getResponse.status).toBe(405)
    expect(getResponse.headers.get('allow')).toContain('POST')
    expect(fetchHits).toBe(1)

    const postResponse = await fetch(`${base}/ready`, { method: 'POST' })
    expect(postResponse.status).toBe(200)
    expect(await postResponse.text()).toBe('posted')
    expect(fetchHits).toBe(1)
  })

  it('serves different static responses for methods on the same path', async () => {
    const router = new Router()
    router.get('/status', new Response('read'))
    router.post('/status', new Response('write', { status: 201 }))
    server = await router.serve({ port: 0 })
    const base = `http://127.0.0.1:${server.port}`

    const getResponse = await fetch(`${base}/status`)
    expect(getResponse.status).toBe(200)
    expect(await getResponse.text()).toBe('read')

    const postResponse = await fetch(`${base}/status`, { method: 'POST' })
    expect(postResponse.status).toBe(201)
    expect(await postResponse.text()).toBe('write')
  })

  it('preserves first registration wins across static and dynamic handlers', async () => {
    const router = new Router()
    router.get('/static-first', new Response('static first'))
    router.get('/static-first', () => new Response('dynamic second'))
    router.get('/dynamic-first', () => new Response('dynamic first'))
    router.get('/dynamic-first', new Response('static second'))
    router.get('/duplicate-static', new Response('first'))
    router.get('/duplicate-static', new Response('second'))
    server = await router.serve({ port: 0, nativeRoutes: true })
    const base = `http://127.0.0.1:${server.port}`

    expect(await fetch(`${base}/static-first`).then(response => response.text())).toBe('static first')
    expect(await fetch(`${base}/dynamic-first`).then(response => response.text())).toBe('dynamic first')
    expect(await fetch(`${base}/duplicate-static`).then(response => response.text())).toBe('first')
  })

  it('merges static and dynamic methods when native routing is enabled', async () => {
    const router = new Router()
    router.get('/mixed', new Response('static get'))
    router.post('/mixed', () => new Response('dynamic post', { status: 201 }))
    server = await router.serve({ port: 0, nativeRoutes: true })
    const base = `http://127.0.0.1:${server.port}`

    expect(await fetch(`${base}/mixed`).then(response => response.text())).toBe('static get')
    const postResponse = await fetch(`${base}/mixed`, { method: 'POST' })
    expect(postResponse.status).toBe(201)
    expect(await postResponse.text()).toBe('dynamic post')
  })

  it('rebuilds static routes on reload', async () => {
    const router = new Router()
    router.get('/ready', new Response('ready'))
    server = await router.serve({ port: 0 })
    const firstBase = `http://127.0.0.1:${server.port}`
    expect(await fetch(`${firstBase}/ready`, { headers: { Connection: 'close' } }).then(response => response.text())).toBe('ready')

    const reloadable = router as Router & { reload: () => Promise<void> }
    await reloadable.reload()
    server = reloadable.serverInstance ?? undefined
    const reloadedBase = `http://localhost:${server!.port}`
    expect(await fetch(`${reloadedBase}/ready`).then(response => response.text())).toBe('ready')
  })
})
