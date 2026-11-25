/**
 * Routes that share a parameter position keep their own parameter names and
 * constraints.
 *
 * The trie gave every route through one parameter position a single node,
 * and the first route registered there named it and constrained it for all
 * of them. With `/models/{slug}` registered before
 * `/models/{dashboardModel}/{id}/actions/{dashboardAction}`, the second route
 * was handed `slug` and never `dashboardModel`, so a handler reading its own
 * parameter got nothing (stacksjs/stacks#3350). Registered the other way
 * round, the first route got the other's name. And a `whereNumber` on the first
 * route turned away every request for the second whose segment was not a
 * number.
 */

import { describe, expect, it } from 'bun:test'
import { Router } from '../src/router'

type Register = (router: Router) => void

async function answer(register: Register[], method: string, path: string): Promise<{ status: number, body: any }> {
  const router = new Router()
  for (const add of register) add(router)
  const res = await router.handleRequest(new Request(`http://localhost${path}`, { method }))
  return { status: res.status, body: res.status === 200 ? await res.json() : await res.text() }
}

const store: Register = router => router.post('/models/{slug}', (req: any) => Response.json({ route: 'store', params: req.params }))
const action: Register = router => router.post('/models/{dashboardModel}/{id}/actions/{dashboardAction}', (req: any) => Response.json({ route: 'action', params: req.params }))

describe('routes sharing a parameter position', () => {
  it('give each route its own parameter names, whichever was registered first', async () => {
    for (const order of [[store, action], [action, store]]) {
      expect(await answer(order, 'POST', '/models/runtime-second/worker%3Aone/actions/archive')).toEqual({
        status: 200,
        body: { route: 'action', params: { dashboardModel: 'runtime-second', id: 'worker:one', dashboardAction: 'archive' } },
      })
      expect(await answer(order, 'POST', '/models/runtime-second')).toEqual({
        status: 200,
        body: { route: 'store', params: { slug: 'runtime-second' } },
      })
    }
  })

  it('apply each route\'s own constraint, not the first route\'s', async () => {
    const numeric: Register = (router) => {
      router.get('/items/{id}', (req: any) => Response.json({ route: 'numeric', params: req.params }))
      router.whereNumber('id')
    }
    const named: Register = router => router.get('/items/{name}/edit', (req: any) => Response.json({ route: 'named', params: req.params }))
    for (const order of [[numeric, named], [named, numeric]]) {
      expect(await answer(order, 'GET', '/items/blue-chair/edit')).toEqual({ status: 200, body: { route: 'named', params: { name: 'blue-chair' } } })
      expect(await answer(order, 'GET', '/items/42')).toEqual({ status: 200, body: { route: 'numeric', params: { id: '42' } } })
      expect((await answer(order, 'GET', '/items/blue-chair')).status).toBe(404)
    }
  })

  it('keep the name a route gives a segment it shares with a constrained route', async () => {
    // The constrained route fails at the end; the walk backs up and the
    // other route's name is the one the handler sees.
    const constrained: Register = (router) => {
      router.get('/files/{id}/raw', (req: any) => Response.json({ route: 'constrained', params: req.params }))
      router.whereNumber('id')
    }
    const loose: Register = router => router.get('/files/{path}/raw/{format}', (req: any) => Response.json({ route: 'loose', params: req.params }))
    for (const order of [[constrained, loose], [loose, constrained]]) {
      expect(await answer(order, 'GET', '/files/7/raw')).toEqual({ status: 200, body: { route: 'constrained', params: { id: '7' } } })
      expect(await answer(order, 'GET', '/files/notes/raw/txt')).toEqual({ status: 200, body: { route: 'loose', params: { path: 'notes', format: 'txt' } } })
    }
  })
})
