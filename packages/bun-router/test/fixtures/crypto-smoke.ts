import type { EnhancedRequest } from '../../src/types'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

// Each feature runs in a fresh process, then repeats to exercise the cached loader.
const { Csrf, FileUpload, JWT, PerformanceMonitor, RequestId } = await import(process.argv[2])
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const request = (init?: RequestInit) => new Request('http://localhost/resource', init) as EnhancedRequest & { profiling?: { requestId: string } }
const next = async () => new Response('hello')

switch (process.argv[3]) {
  case 'jwt': {
    const jwt = new JWT('test-secret')
    for (let i = 0; i < 2; i++) {
      const token = jwt.sign({ sub: 'user' })
      assert.equal(jwt.verify(token)?.sub, 'user')
      const tail = token.endsWith('a') ? 'b' : 'a'
      assert.equal(jwt.verify(token.slice(0, -1) + tail), null)
    }
    break
  }
  case 'csrf': {
    const csrf = new Csrf()
    const tokens = new Set<string>()
    for (let i = 0; i < 2; i++) {
      const issued = await csrf.handle(request(), next)
      const cookie = issued.headers.get('set-cookie')!.split(';')[0]
      const token = cookie.slice(cookie.indexOf('=') + 1)
      assert.match(token, /^[0-9a-f]{64}$/)
      tokens.add(token)
      const valid = await csrf.handle(request({ method: 'POST', headers: { cookie, 'X-CSRF-TOKEN': token } }), next)
      assert.equal(valid.status, 200)
      const mismatch = `${token[0] === 'a' ? 'b' : 'a'}${token.slice(1)}`
      const denied = await csrf.handle(request({ method: 'POST', headers: { cookie, 'X-CSRF-TOKEN': mismatch } }), next)
      assert.equal(denied.status, 403)
    }
    assert.equal(tokens.size, 2)
    break
  }
  case 'request-id': {
    const middleware = new RequestId()
    const ids = new Set<string>()
    for (let i = 0; i < 2; i++) {
      const response = await middleware.handle(request(), next)
      const id = response.headers.get('X-Request-ID')!
      assert.match(id, uuid)
      ids.add(id)
    }
    assert.equal(ids.size, 2)
    const preserved = await middleware.handle(request({ headers: { 'X-Request-ID': 'client-id' } }), next)
    assert.equal(preserved.headers.get('X-Request-ID'), 'client-id')
    break
  }
  case 'upload': {
    const destination = mkdtempSync(join(tmpdir(), 'router-crypto-upload-'))
    try {
      const upload = new FileUpload({ destination })
      const names = new Set<string>()
      for (let i = 0; i < 2; i++) {
        const body = new FormData()
        body.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }))
        const req = request({ method: 'POST', body })
        const response = await upload.handle(req, next)
        assert.equal(response.status, 200)
        const uploaded = req.file('file')!
        assert.match(uploaded.filename.slice(0, -4), uuid)
        assert.equal(await Bun.file(uploaded.path).text(), 'hello')
        names.add(uploaded.filename)
      }
      assert.equal(names.size, 2)
    }
    finally {
      rmSync(destination, { recursive: true, force: true })
    }
    break
  }
  case 'monitor': {
    const monitor = new PerformanceMonitor({ enabled: true, sampleRate: 1, profiling: { enabled: true } })
    try {
      for (let i = 0; i < 2; i++) {
        const req = request()
        assert.equal((await monitor.handle(req, next))?.status, 200)
        assert.match(req.profiling!.requestId, uuid)
      }
      const metrics = monitor.getMetrics()
      assert.equal(metrics.length, 2)
      for (const metric of metrics)
        assert.match(metric.requestId, uuid)
      assert.notEqual(metrics[0].requestId, metrics[1].requestId)
    }
    finally {
      monitor.destroy()
    }
    break
  }
  case 'cache': {
    // ResponseCache is a direct module, not a public barrel export.
    const { ResponseCache } = await import('../../src/middleware/response_cache')
    const cache = new ResponseCache({ storage: { type: 'memory' } })
    try {
      for (let i = 0; i < 2; i++) {
        const response = await cache.handle(request(), next)
        assert.equal(await response.text(), 'hello')
        assert.equal(response.headers.get('ETag'), 'W/"aaf4c61ddcc5e8a2"')
        assert.equal(response.headers.get('X-Cache'), i ? 'HIT' : 'MISS')
      }
      assert.equal(cache.getStats().hits, 1)
    }
    finally {
      cache.destroy()
    }
    break
  }
  default:
    throw new Error('Unknown crypto smoke feature')
}
