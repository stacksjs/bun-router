/**
 * The compile-time half of typed routes.
 *
 * The claim is that a TypeScript consumer sees a route's input and output
 * types with no generation step in between - so the test has to be a compile,
 * not an assertion at runtime. Checked by `bun run typecheck`; nothing here
 * executes, and the `.test-d.ts` suffix keeps it out of `bun test`.
 *
 * The `@ts-expect-error` lines are the load-bearing half. Each one fails the
 * build if the error it expects stops happening, which is what makes this a
 * test of inference rather than a demonstration that some code compiles.
 */

import type { EnhancedRequest } from '../src/types'
import { Router } from '../src/router'
import { createTypedClient, createTypedRouter, defineEndpoint } from '../src/typed'

type Equal<TLeft, TRight>
  = (<T>() => T extends TLeft ? 1 : 2) extends (<T>() => T extends TRight ? 1 : 2) ? true : false
type Expect<T extends true> = T

/** Stand-in for a validation rule, shaped the way `Validator<T>` is. */
declare function rule<T>(): { test: (value: T) => boolean, validate: (value: any) => any }

const router = new Router()

/** An "action": a handle plus the validations that describe its body. */
const storeProject = {
  validations: {
    name: { rule: rule<string>() },
    budget: { rule: rule<number>() },
  },
  handle: () => ({ id: 1, name: 'apollo' }),
}

const exportProjects = () => new Response('a,b,c')

const createUser = defineEndpoint<{ email: string }, { id: number }>(() => ({ id: 1 }))

const api = createTypedRouter(router)
  .get('/v1/projects', () => ({ projects: [{ id: 1, name: 'apollo' }] }))
  .get('/v1/projects/{id}', (req: EnhancedRequest) => ({ id: Number(req.params.id), archived: false }))
  .post('/v1/projects', storeProject)
  .post('/v1/users', createUser)
  .get('/v1/projects/{id}/export', exportProjects)

/*
 * Not exported: `--isolatedDeclarations` is on for this package, and exporting
 * a type that names an inferred local would demand an explicit annotation for
 * the one thing under test - the type the builder inferred. Applications do not
 * compile with that flag and can export theirs.
 */
type AppRoutes = typeof api

const client = createTypedClient<AppRoutes>({ baseUrl: 'https://api.example.com' })

// ── outputs come from the handler's own return type ───────────────────────

type IndexResult = Awaited<ReturnType<typeof client.get<'/v1/projects'>>>
type IndexIsInferred = Expect<Equal<IndexResult, { projects: Array<{ id: number, name: string }> }>>

type ShowResult = Awaited<ReturnType<typeof client.get<'/v1/projects/{id}'>>>
type ShowIsInferred = Expect<Equal<ShowResult, { id: number, archived: boolean }>>

// A handler that writes the wire format itself is honestly unknown, not a lie.
type ExportResult = Awaited<ReturnType<typeof client.get<'/v1/projects/{id}/export'>>>
type ExportIsUnknown = Expect<Equal<ExportResult, unknown>>

// ── inputs come from validations, or from an explicit declaration ─────────

type StoreBody = Parameters<typeof client.post<'/v1/projects'>>[1]
type StoreBodyIsInferred = Expect<Equal<StoreBody, { name: string, budget: number }>>

type UserBody = Parameters<typeof client.post<'/v1/users'>>[1]
type UserBodyIsDeclared = Expect<Equal<UserBody, { email: string }>>

// ── the calls that must compile ───────────────────────────────────────────

export async function usage(): Promise<void> {
  const projects = await client.get('/v1/projects')
  const firstName: string = projects.projects[0]!.name

  const one = await client.get('/v1/projects/{id}', { params: { id: '42' } })
  const archived: boolean = one.archived

  const created = await client.post('/v1/projects', { name: 'apollo', budget: 1200 })
  const createdId: number = created.id

  void firstName
  void archived
  void createdId
}

// ── the calls that must NOT ───────────────────────────────────────────────

export function negatives(): void {
  // @ts-expect-error a path the API does not serve
  client.get('/v1/nope')

  // @ts-expect-error this path is a POST, not a GET
  client.get('/v1/users')

  // @ts-expect-error `budget` is a number in the handler's validations
  client.post('/v1/projects', { name: 'apollo', budget: 'twelve hundred' })

  // @ts-expect-error `name` is required by the handler's validations
  client.post('/v1/projects', { budget: 1200 })

  // @ts-expect-error `{id}` is the only param this path has
  client.get('/v1/projects/{id}', { params: { slug: 'apollo' } })
}

/*
 * The one the whole feature is about.
 *
 * A consumer that expects a shape the handler no longer returns has to stop
 * compiling - with no CLI run in between, and no generated file that could
 * still be holding yesterday's answer.
 */
export async function staleExpectation(): Promise<void> {
  const projects = await client.get('/v1/projects')

  // @ts-expect-error there is no `items` on this response, and there never was
  void projects.items
}
