# Typed Routes and the Typed Client

A client that knows what every endpoint takes and returns, with no generation step
between changing a route and seeing the type change.

## The problem

`router.get('/v1/projects', handler)` tells the compiler nothing a client could use.
The path is a string, the handler returns a `Response`, and the only route-aware
client you could hand somebody was one generated from an OpenAPI document by running
a CLI command — which has to be re-run, and whose output is stale the moment a route
changes.

## The shape

`createTypedRouter()` registers through the router you give it, exactly as you would
by hand, while accumulating a route map into its own type as you chain:

```ts
// routes.ts
import { createTypedRouter, Router } from '@stacksjs/bun-router'

const router = new Router()

export const api = createTypedRouter(router)
  .get('/v1/projects', () => ({ projects: [{ id: 1, name: 'apollo' }] }))
  .get('/v1/projects/{id}', req => ({ id: Number(req.params.id), archived: false }))

export type AppRoutes = typeof api

await router.serve({ port: 3000 })
```

`createTypedClient()` reads that map back:

```ts
// anywhere TypeScript runs — same repo, a package away, a browser bundle
import type { AppRoutes } from './routes'
import { createTypedClient } from '@stacksjs/bun-router'

const client = createTypedClient<AppRoutes>({ baseUrl: 'https://api.example.com' })

const projects = await client.get('/v1/projects')
//    ^? { projects: { id: number, name: string }[] }

const one = await client.get('/v1/projects/{id}', { params: { id: '42' } })
//    ^? { id: number, archived: boolean }
```

A path the API does not serve is a compile error. A body that does not match the
handler's declared input is a compile error. The awaited result is the handler's own
return type.

## What it reads

Handlers come in more than one shape, and three are understood, in order:

**A plain function.** Its return type is the output. The input is unknown — a
function that reads `req.json()` says nothing about what it expects to find.

```ts
.get('/v1/projects', () => ({ projects: [] }))
```

**An object with `handle()`.** Same output inference, and if it also carries a
`validations` map, the input comes from that — the same object the validator runs, so
the two cannot drift.

```ts
const storeProject = {
  validations: {
    name: { rule: v.string() },
    budget: { rule: v.number() },
  },
  handle: req => ({ id: 1 }),
}

api.post('/v1/projects', storeProject)
// client.post('/v1/projects', { name: string, budget: number })
```

This shape is deliberate. A framework built on this router whose "actions" are
`{ handle, validations }` objects gets typed routes from this builder without needing
one of its own.

**An explicit declaration**, for a plain function that validates its own body where
there is no `validations` map to read:

```ts
import { defineEndpoint } from '@stacksjs/bun-router'

const createUser = defineEndpoint<{ email: string }, { id: number }>(async (req) => {
  const body = await req.json()
  return { id: 1 }
})
```

## Per-route options

Settings are an argument rather than a chained call, because chaining `.middleware()`
would return the route and lose the accumulated map:

```ts
api.post('/v1/projects', storeProject, {
  middleware: 'auth',
  name: 'projects.store',
  rateLimit: { max: 10, window: 'minute' },
})
```

They are applied by calling the matching method on whatever your router handed back.
If the route cannot take one, this **throws** rather than shrugging: an option that
was silently dropped is a middleware that silently did not run, and on
`middleware: 'auth'` that is an unprotected endpoint nobody was told about.

## Client options

```ts
const client = createTypedClient<AppRoutes>({
  baseUrl: 'https://api.example.com',
  // A function is called per request, so a rotating token does not need a new client.
  headers: () => ({ authorization: `Bearer ${token()}` }),
  credentials: 'include',
  fetch: myRetryingFetch,
  // Return a value instead of throwing on 4xx/5xx.
  onError: error => ({ failed: error.status }),
})
```

Per call: `params`, `query`, `headers`, `signal`. Path params fill both `{name}` and
`:name` placeholders, and are percent-encoded — a raw `/` in a caller-supplied param
would otherwise address a different endpoint.

A refusal throws `TypedClientError`, carrying `status`, the parsed `body`, and the
`Response`. A 204 arrives as `undefined` rather than blowing up on an empty body.
`client.raw(method, path, init)` hands back the `Response` itself for the cases that
need it.

## What it does not promise

The output type is the handler's return type as TypeScript sees it, not a model of
what JSON does to it — a `Date` in a response body arrives as a string, and the type
will still say `Date`.

A handler that returns a `Response` or a stream has taken over the wire format
itself, and is typed `unknown`. That is the honest answer, and the one case where the
client can tell you less than reading the handler would.

## No groups

There is deliberately no `.group()` on the typed builder. A prefix applied only at
runtime makes every accumulated path type wrong, and one applied only in the type is
a second place for the URL to be written down. Write the full path; it is what the
client will show you anyway.

## Not a replacement

`router.get(...)` stays exactly as it is, for every route that would rather be lazy
than inferable. OpenAPI stays the answer for consumers that are not TypeScript in
your repo — mobile clients, third-party integrators, Swagger UI. Both are permanent;
this is the same-repo, TypeScript-to-TypeScript path.
