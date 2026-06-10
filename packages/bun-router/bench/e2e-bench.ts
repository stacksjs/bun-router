/* eslint-disable no-console */
/**
 * End-to-end HTTP benchmark: Bun-native route dispatch vs the fetch-handler
 * path, measured through real sockets.
 * Run: bun bench/e2e-bench.ts
 */
import { Router } from '../src/router'

function buildRouter(): Router {
  const router = new Router({ verbose: false })
  router.get('/plain', () => new Response('plain'))
  router.get('/users/{id}', req => new Response(req.params.id))
  for (let i = 0; i < 30; i++) {
    router.get(`/static/page-${i}`, () => new Response(`page-${i}`))
  }
  return router
}

async function bench(base: string, path: string, iterations = 20_000): Promise<number> {
  // Warmup
  for (let i = 0; i < 2_000; i++) await fetch(`${base}${path}`)
  const start = Bun.nanoseconds()
  for (let i = 0; i < iterations; i++) await fetch(`${base}${path}`)
  const elapsedMs = (Bun.nanoseconds() - start) / 1e6
  return Math.round(iterations / (elapsedMs / 1000))
}

async function run(label: string, nativeRoutes: boolean): Promise<void> {
  const router: any = buildRouter()
  const server = await router.serve({ port: 0, nativeRoutes })
  const base = `http://localhost:${server.port}`

  const plain = await bench(base, '/plain')
  const param = await bench(base, '/users/42')
  console.log(`${label.padEnd(26)} static ${plain.toLocaleString().padStart(8)} req/s   param ${param.toLocaleString().padStart(8)} req/s`)

  server.stop(true)
}

console.log('--- end-to-end HTTP (sequential keep-alive requests) ---')
await run('fetch handler (default)', false)
await run('nativeRoutes: true', true)
