/**
 * What the compiler knows about a route's handler.
 *
 * `Router.get` and friends carry a `TPath` generic whose whole job is to narrow
 * an inline handler's `request.params` to the keys the path declares. The
 * docblock on `get()` has claimed that since it was written, and it was not
 * true: the handler parameter was typed as a union containing two call
 * signatures, which gives TypeScript nothing to contextually type an arrow
 * with, so `req` was implicitly `any` and every `req.params.whatever` passed.
 *
 * Checked by `bun run typecheck`; nothing here executes, and the `.test-d.ts`
 * suffix keeps it out of `bun test`. The `@ts-expect-error` lines are the
 * load-bearing half - each fails the build if the error it expects stops
 * happening.
 */

import type { EnhancedRequest } from '../src/types'
import { Router } from '../src'

type Equal<TLeft, TRight>
  = (<T>() => T extends TLeft ? 1 : 2) extends (<T>() => T extends TRight ? 1 : 2) ? true : false
type Expect<T extends true> = T

const router = new Router()

// ── an inline handler is typed, and its params are the path's ─────────────

router.get('/users/{id}', (req) => {
  const id: string = req.params.id
  type IdIsString = Expect<Equal<typeof req.params.id, string>>

  // @ts-expect-error `slug` is not a parameter of this path
  void req.params.slug

  return new Response(id)
})

router.get('/a/{x}/b/{y}', (req) => {
  const both: string = req.params.x + req.params.y
  return new Response(both)
})

router.get('/posts/{slug?}', (req) => {
  // Optional in the path, optional in the type.
  type SlugIsOptional = Expect<Equal<typeof req.params.slug, string | undefined>>
  return new Response(String(req.params.slug))
})

router.get('/health', (req) => {
  // @ts-expect-error this path declares no parameters at all
  void req.params.anything
  return new Response('ok')
})

// The rest of the request survives the narrowing - `params` is replaced, not
// the whole request.
router.post('/orders/{id}', async (req) => {
  void req.headers.get('accept')
  void req.bearerToken()
  void await req.json()
  return new Response(req.params.id)
})

// Every method carries it, not just `get`.
router.put('/u/{id}', req => new Response(req.params.id))
router.patch('/u/{id}', req => new Response(req.params.id))
router.delete('/u/{id}', req => new Response(req.params.id))
router.options('/u/{id}', req => new Response(req.params.id))
router.match(['GET', 'POST'], '/u/{id}', req => new Response(req.params.id))
router.any('/u/{id}', req => new Response(req.params.id))

// ── every other handler form still compiles ───────────────────────────────

// An explicitly annotated handler, which is how a lot of existing code is
// written, must keep working even though its parameter is wider.
router.get('/legacy', (req: EnhancedRequest) => new Response(req.url))

// String action paths.
router.post('/users', 'Actions/CreateUserAction')

// A class with a `handle()`.
class ShowUser {
  async handle(req: EnhancedRequest): Promise<Response> {
    return new Response(req.url)
  }
}
router.get('/class/{id}', ShowUser)

// A prebuilt response, for a static route.
router.get('/static', new Response('hi'))

export {}
