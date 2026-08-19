import type { Server } from 'bun'
import type { EnhancedRequest, WebSocketData } from '../src/types'
import { afterEach, describe, expect, it } from 'bun:test'
import { Router } from '../src/router'

/**
 * A catch-all binds the whole remaining path, separators included. The
 * named spelling, `{name}*`, is what file-based routing emits for a
 * `[...name]` file, so a route declared by a file was matching one
 * segment and declining the rest — the shape that makes every nested
 * directory a 404 while the top level looks like it works.
 */
describe('catch-all routes', () => {
  let server: Server<WebSocketData> | null = null

  afterEach(async () => {
    await server?.stop(true)
    server = null
  })

  async function get(router: Router, path: string): Promise<{ status: number, body: string }> {
    server = await router.serve({ port: 0 })
    const response = await fetch(`http://localhost:${server.port}${path}`)
    return { status: response.status, body: await response.text() }
  }

  const params = (req: EnhancedRequest) => new Response(JSON.stringify(req.params ?? {}))

  it('binds every remaining segment to a named catch-all', async () => {
    const router = new Router()
    router.get('/files/{path}*', params)

    expect(JSON.parse((await get(router, '/files/a')).body)).toEqual({ path: 'a' })
  })

  it('matches a named catch-all past the first segment', async () => {
    const router = new Router()
    router.get('/files/{path}*', params)

    const response = await get(router, '/files/a/b/c.ts')
    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ path: 'a/b/c.ts' })
  })

  it('carries the named parameters that precede a catch-all', async () => {
    const router = new Router()
    router.get('/{owner}/{repository}/tree/{ref}/{path}*', params)

    const response = await get(router, '/stacks/stacks/tree/main/app/nested/deep.ts')
    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toEqual({
      owner: 'stacks',
      repository: 'stacks',
      ref: 'main',
      path: 'app/nested/deep.ts',
    })
  })

  it('leaves the bare catch-all bound to `wildcard`', async () => {
    const router = new Router()
    router.get('/files/*', params)

    expect(JSON.parse((await get(router, '/files/a/b')).body)).toEqual({ wildcard: 'a/b' })
  })

  it('declines a request that stops short of the catch-all', async () => {
    const router = new Router()
    router.get('/files/{path}*', params)

    expect((await get(router, '/files')).status).toBe(404)
  })

  it('keeps static text literal in a path that also has a catch-all', async () => {
    const router = new Router()
    router.get('/api/v1.0/{path}*', params)

    // The dot is escaped rather than matching any character, so a request
    // for `v1X0` is a different route and gets no answer here.
    expect((await get(router, '/api/v1X0/thing')).status).toBe(404)
  })
})
