/* eslint-disable no-console */
/**
 * Hot-path micro-benchmark for the router.
 * Run: bun bench/router-bench.ts
 */
import { Router } from '../src/router'

async function bench(name: string, fn: () => Promise<unknown>, iterations = 50_000): Promise<number> {
  // Warmup
  for (let i = 0; i < 2_000; i++) await fn()
  const start = Bun.nanoseconds()
  for (let i = 0; i < iterations; i++) await fn()
  const elapsedMs = (Bun.nanoseconds() - start) / 1e6
  const opsPerSec = Math.round(iterations / (elapsedMs / 1000))
  console.log(`${name.padEnd(42)} ${opsPerSec.toLocaleString().padStart(12)} ops/s  (${(elapsedMs / iterations * 1000).toFixed(2)} µs/op)`)
  return opsPerSec
}

const router = new Router({ verbose: false })

// Realistic route table
router.get('/', () => new Response('home'))
router.get('/about', () => new Response('about'))
router.get('/health', () => new Response('ok'))
for (let i = 0; i < 50; i++) {
  router.get(`/static/page-${i}`, () => new Response(`page-${i}`))
}
router.get('/api/users', () => new Response('[]'))
router.get('/api/users/{id}', req => new Response(req.params.id))
router.get('/api/users/{id}/posts/{postId}', req => new Response(`${req.params.id}:${req.params.postId}`))
router.post('/api/users', () => new Response('created', { status: 201 }))
router.get('/api/posts/{slug}', req => new Response(req.params.slug))
router.get('/files/*', req => new Response(req.params.wildcard ?? ''))

const mkReq = (path: string, method = 'GET') => new Request(`http://localhost${path}`, { method })

console.log('--- route dispatch (handleRequest) ---')
await bench('static route', () => router.handleRequest(mkReq('/about')))
await bench('static route (deep table)', () => router.handleRequest(mkReq('/static/page-42')))
await bench('dynamic route (1 param)', () => router.handleRequest(mkReq('/api/users/123')))
await bench('dynamic route (2 params)', () => router.handleRequest(mkReq('/api/users/123/posts/456')))
await bench('wildcard route', () => router.handleRequest(mkReq('/files/a/b/c.txt')))
await bench('404 not found', () => router.handleRequest(mkReq('/nope/nothing/here')))

console.log('--- matchRoute only ---')
await bench('matchRoute static', async () => router.matchRoute('/about', 'GET', 'localhost'), 200_000)
await bench('matchRoute dynamic', async () => router.matchRoute('/api/users/123', 'GET', 'localhost'), 200_000)
await bench('matchRoute high-cardinality', async () => router.matchRoute(`/api/users/${Math.random()}`, 'GET', 'localhost'), 50_000)

// Middleware-heavy dispatch
const routerMw = new Router({ verbose: false })
routerMw.use(async (_req, next) => next())
routerMw.use(async (_req, next) => next())
routerMw.use(async (_req, next) => next())
routerMw.get('/mw', () => new Response('mw'))
console.log('--- with 3 global middleware ---')
await bench('static route + 3 middleware', () => routerMw.handleRequest(mkReq('/mw')))
