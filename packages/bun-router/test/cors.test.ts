import type { EnhancedRequest } from '../src/types'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { config } from '../src/config'
import Cors from '../src/middleware/cors'

function createMockRequest(options: {
  url?: string
  method?: string
  headers?: Record<string, string>
} = {}): EnhancedRequest {
  const url = options.url || 'http://localhost:3000/test'
  const headers = new Headers(options.headers || {})

  return {
    url,
    method: options.method || 'GET',
    headers,
    params: {},
    clone: () => createMockRequest(options),
  } as unknown as EnhancedRequest
}

const mockNext = async () => new Response('OK', { status: 200 })

describe('CORS Middleware', () => {
  let originalCors: any

  beforeEach(() => {
    originalCors = (config.server as any)?.cors
  })

  afterEach(() => {
    ;(config.server as any).cors = originalCors
  })

  it('never combines wildcard origin with credentials (default config)', async () => {
    // Default config: origin '*', credentials false
    ;(config.server as any).cors = { enabled: true, origin: '*', credentials: false }
    const cors = new Cors()

    const res = await cors.handle(createMockRequest({ headers: { origin: 'https://evil.example' } }), mockNext)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('never emits "*" + credentials when origin is "*" and credentials enabled', async () => {
    ;(config.server as any).cors = { enabled: true, origin: '*', credentials: true }
    const cors = new Cors()

    const res = await cors.handle(createMockRequest({ headers: { origin: 'https://app.example' } }), mockNext)

    // With credentials enabled and wildcard configured, it must reflect the
    // request origin (never literal "*") and may set credentials.
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('does not advertise credentials for a wildcard request with no Origin header', async () => {
    ;(config.server as any).cors = { enabled: true, origin: '*', credentials: true }
    const cors = new Cors()

    const res = await cors.handle(createMockRequest({}), mockNext)

    // No origin to safely reflect: must NOT emit "*" and must NOT claim credentials.
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('reflects only allowlisted origins when origin is an array', async () => {
    ;(config.server as any).cors = {
      enabled: true,
      origin: ['https://good.example', 'https://also-good.example'],
      credentials: true,
    }
    const cors = new Cors()

    const allowed = await cors.handle(createMockRequest({ headers: { origin: 'https://good.example' } }), mockNext)
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://good.example')
    expect(allowed.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(allowed.headers.get('Vary')).toBe('Origin')

    const denied = await cors.handle(createMockRequest({ headers: { origin: 'https://evil.example' } }), mockNext)
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(denied.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    // Vary still set so caches don't serve a wrong allow-origin to another origin.
    expect(denied.headers.get('Vary')).toBe('Origin')
  })

  it('honors a single explicit configured origin', async () => {
    ;(config.server as any).cors = { enabled: true, origin: 'https://only.example', credentials: true }
    const cors = new Cors()

    const res = await cors.handle(createMockRequest({ headers: { origin: 'https://other.example' } }), mockNext)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://only.example')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('preflight OPTIONS gets the same safe headers', async () => {
    ;(config.server as any).cors = { enabled: true, origin: '*', credentials: true }
    const cors = new Cors()

    const res = await cors.handle(createMockRequest({ method: 'OPTIONS', headers: { origin: 'https://app.example' } }), mockNext)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example')
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*')
  })

  it('default (no config) is permissive but credential-free', async () => {
    ;(config.server as any).cors = undefined
    const cors = new Cors()

    const res = await cors.handle(createMockRequest({ headers: { origin: 'https://anything.example' } }), mockNext)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })
})
