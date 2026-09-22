import type { EnhancedRequest } from '../src/types'
import { describe, expect, it } from 'bun:test'
import { Router } from '../src'
import { compileMiddlewareChain } from '../src/router/middleware-chain'

const request = new Request('http://localhost/middleware-chain') as EnhancedRequest

describe('compiled middleware chains', () => {
  it('keeps the public builder promise-compatible', async () => {
    const expected = new Response('ok')
    const chain = new Router().buildMiddlewareChain([() => expected])

    const response = chain(request)
    expect(response).toBeInstanceOf(Promise)
    expect(await response).toBe(expected)
  })

  it('keeps an empty chain synchronous', () => {
    const chain = compileMiddlewareChain([])

    expect(chain(request)).toBeNull()
  })

  it('keeps a synchronous chain synchronous and ordered', () => {
    const calls: string[] = []
    const expected = new Response('ok')
    const chain = compileMiddlewareChain([
      (_request, next) => {
        calls.push('before')
        const response = next()
        calls.push('after')
        return response
      },
      () => {
        calls.push('handler')
        return expected
      },
    ])

    const response = chain(request)
    expect(response).toBe(expected)
    expect(calls).toEqual(['before', 'handler', 'after'])
  })

  it('preserves asynchronous chains and short circuits', async () => {
    let downstreamCalls = 0
    const expected = new Response('blocked', { status: 403 })
    const blocked = compileMiddlewareChain([
      () => expected,
      () => {
        downstreamCalls++
        return new Response('unexpected')
      },
    ])
    expect(blocked(request)).toBe(expected)
    expect(downstreamCalls).toBe(0)

    const asynchronous = compileMiddlewareChain([
      (_request, next) => next(),
      async () => expected,
    ])
    const pending = asynchronous(request)
    expect(pending).toBeInstanceOf(Promise)
    expect(await pending).toBe(expected)
  })

  it('preserves synchronous throws and rejected promises', async () => {
    const synchronous = compileMiddlewareChain([
      () => {
        throw new Error('sync failure')
      },
    ])
    await expect(synchronous(request)).rejects.toThrow('sync failure')

    const asynchronous = compileMiddlewareChain([
      (_request, next) => next(),
      async () => {
        throw new Error('async failure')
      },
    ])
    await expect(asynchronous(request)).rejects.toThrow('async failure')

    const recovered = new Response('recovered')
    const recovery = compileMiddlewareChain([
      (_request, next) => Promise.resolve(next()).catch(() => recovered),
      () => {
        throw new Error('downstream failure')
      },
    ])
    expect(await recovery(request)).toBe(recovered)
  })

  it('preserves the null-to-200 fallback for synchronous and asynchronous downstream work', async () => {
    const synchronous = compileMiddlewareChain([
      (_request, next) => next(),
      () => null,
    ])
    const syncResponse = synchronous(request)
    expect(syncResponse).toBeInstanceOf(Response)
    expect((syncResponse as Response).status).toBe(200)

    const asynchronous = compileMiddlewareChain([
      (_request, next) => next(),
      async () => null,
    ])
    const asyncResponse = asynchronous(request)
    expect(asyncResponse).toBeInstanceOf(Promise)
    expect((await asyncResponse)?.status).toBe(200)
  })

  it('assimilates promise-like middleware results before applying the fallback', async () => {
    const thenable = {
      then(resolve: (response: null) => void) {
        resolve(null)
      },
    } as Promise<Response | null>
    const chain = compileMiddlewareChain([
      (_request, next) => next(),
      () => thenable,
    ])

    const response = await chain(request)
    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(200)
  })

  it('reads a promise-like then accessor once', async () => {
    let reads = 0
    const thenable = Object.defineProperty({}, 'then', {
      get() {
        reads++
        if (reads > 1)
          throw new Error('then read twice')
        return (resolve: (response: null) => void) => resolve(null)
      },
    }) as Promise<Response | null>
    const chain = compileMiddlewareChain([
      (_request, next) => next(),
      () => thenable,
    ])

    const response = await chain(request)
    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(200)
    expect(reads).toBe(1)
  })

  it('defers promise-like then calls until the current stack completes', async () => {
    let ready = false
    const thenable = {
      then(resolve: (response: Response) => void) {
        resolve(new Response(ready ? 'ready' : 'early'))
      },
    } as Promise<Response>
    const chain = compileMiddlewareChain([
      (_request, next) => {
        const pending = next()
        ready = true
        return pending
      },
      () => thenable,
    ])

    expect(await (await chain(request))?.text()).toBe('ready')
  })

  it('honors public middleware builder overrides in run and dispatch paths', async () => {
    const router = new Router()
    const stockBuilder = router.buildMiddlewareChain
    const expected = new Response('ok')
    let builds = 0
    router.buildMiddlewareChain = (middlewares) => {
      builds++
      return stockBuilder.call(router, middlewares)
    }

    expect(await router.runMiddleware(request, [() => expected])).toBe(expected)

    router.get('/override', () => expected, 'api', undefined, [(_request, next) => next()])
    expect(await router.handleRequest(new Request('http://localhost/api/override'))).toBe(expected)
    expect(builds).toBe(2)
  })

  it('replays downstream work when next is called repeatedly', () => {
    let downstreamCalls = 0
    const chain = compileMiddlewareChain([
      (_request, next) => {
        next()
        return next()
      },
      () => {
        downstreamCalls++
        return new Response('ok')
      },
    ])

    expect(chain(request)).toBeInstanceOf(Response)
    expect(downstreamCalls).toBe(2)
  })

  it('replays asynchronous downstream work when next is called repeatedly', async () => {
    let downstreamCalls = 0
    const chain = compileMiddlewareChain([
      async (_request, next) => {
        await next()
        return next()
      },
      async () => {
        downstreamCalls++
        return new Response('ok')
      },
    ])

    expect(await chain(request)).toBeInstanceOf(Response)
    expect(downstreamCalls).toBe(2)
  })
})
