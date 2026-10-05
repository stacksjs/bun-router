import type { EnhancedRequest, MiddlewareHandler } from '../src/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { MiddlewareFactory } from '../src/middleware/pipeline'
import DDoSProtection from '../src/middleware/ddos_protection'
import Security from '../src/middleware/security'
import { Router } from '../src/router'

/**
 * Everything that decides something by the client's address reads it through
 * `clientAddress()`. Each of these used to take the first `X-Forwarded-For`
 * entry - the one hop a client always writes - so naming an address in that
 * header was enough to be it.
 */

const VISITOR = '203.0.113.7'
const ALLOWED = '192.0.2.10'
const SPOOF = '198.51.100.1'

const ok = async () => new Response('ok')

/** A request run through the router in-process, as handlers see it. */
async function routed(headers: Record<string, string>): Promise<EnhancedRequest> {
  const router = new Router({ verbose: false })
  let captured: EnhancedRequest | undefined
  router.get('/who', (r: EnhancedRequest) => {
    captured = r
    return new Response('ok')
  })
  await router.handleRequest(new Request('http://localhost/who', { headers }))
  return captured!
}

function plain(headers: Record<string, string>): EnhancedRequest {
  return new Request('http://localhost/', { headers }) as unknown as EnhancedRequest
}

describe('request macros', () => {
  test('ip() is the nearest untrusted hop, not the first one', async () => {
    const r = await routed({ 'x-forwarded-for': `${SPOOF}, ${VISITOR}` })
    expect(r.ip()).toBe(VISITOR)
  })

  test('ips() leaves out the hops a client wrote before its own address', async () => {
    const r = await routed({ 'x-forwarded-for': `${SPOOF}, ${VISITOR}, 10.0.0.2` })
    expect(r.ips()).toEqual([VISITOR, '10.0.0.2'])
  })

  test('isFromTrustedProxy() reads the connection, not a header', async () => {
    // In-process there is no proxy, whatever the header claims.
    const r = await routed({ 'x-forwarded-for': '10.0.0.1' })
    expect(r.isFromTrustedProxy(['10.0.0.1'])).toBe(false)
    expect(r.isFromTrustedProxy()).toBe(false)
  })
})

describe('Security ipFiltering', () => {
  test('naming a whitelisted address in X-Forwarded-For does not get a client in', async () => {
    const security = new Security({ ipFiltering: { enabled: true, whitelist: [ALLOWED] } })
    const res = await security.handle(plain({ 'x-forwarded-for': `${ALLOWED}, ${SPOOF}` }), ok)
    expect(res.status).toBe(403)
  })

  test('the address a trusted proxy reports is let through', async () => {
    const security = new Security({ ipFiltering: { enabled: true, whitelist: [ALLOWED] } })
    const res = await security.handle(plain({ 'x-forwarded-for': `${ALLOWED}, 10.0.0.2` }), ok)
    expect(res.status).toBe(200)
  })

  test('lists accept CIDR ranges', async () => {
    const security = new Security({ ipFiltering: { enabled: true, whitelist: ['192.0.2.0/24'], blacklist: ['192.0.2.128/25'] } })
    expect((await security.handle(plain({ 'x-forwarded-for': ALLOWED }), ok)).status).toBe(200)
    expect((await security.handle(plain({ 'x-forwarded-for': '192.0.2.200' }), ok)).status).toBe(403)
    expect((await security.handle(plain({ 'x-forwarded-for': VISITOR }), ok)).status).toBe(403)
  })

  test('a blacklisted client cannot hide behind a prefixed address', async () => {
    const security = new Security({ ipFiltering: { enabled: true, blacklist: [SPOOF] } })
    const res = await security.handle(plain({ 'x-forwarded-for': `${VISITOR}, ${SPOOF}` }), ok)
    expect(res.status).toBe(403)
  })
})

describe('DDoSProtection', () => {
  test('a fresh X-Forwarded-For prefix per request does not reset the count', async () => {
    const ddos = new DDoSProtection({ maxRequestsPerMinute: 2, burstLimit: 100 })
    const codes: number[] = []
    for (let i = 0; i < 4; i++)
      codes.push((await ddos.handle(plain({ 'x-forwarded-for': `198.18.0.${i}, ${VISITOR}` }), ok)).status)
    ddos.destroy()
    expect(codes).toEqual([200, 200, 200, 429])
  })

  test('naming a whitelisted address does not skip the limit', async () => {
    const ddos = new DDoSProtection({ maxRequestsPerMinute: 1, burstLimit: 100, whitelistedIPs: [ALLOWED] })
    const codes: number[] = []
    for (let i = 0; i < 3; i++)
      codes.push((await ddos.handle(plain({ 'x-forwarded-for': `${ALLOWED}, ${VISITOR}` }), ok)).status)
    ddos.destroy()
    expect(codes).toEqual([200, 200, 429])
  })
})

describe('rate limiters keyed on the client', () => {
  async function codesFor(limiter: MiddlewareHandler, count: number): Promise<number[]> {
    const codes: number[] = []
    for (let i = 0; i < count; i++) {
      const res = await limiter(plain({ 'x-forwarded-for': `198.18.3.${i}, ${VISITOR}` }), async () => new Response('ok'))
      codes.push(res?.status ?? 200)
    }
    return codes
  }

  test('the router\'s named throttle middleware', async () => {
    const router = new Router({ verbose: false })
    const throttle = (router as unknown as { namedMiddleware: Map<string, (p?: string) => MiddlewareHandler> }).namedMiddleware.get('throttle')!
    expect(await codesFor(throttle('2,1'), 3)).toEqual([200, 200, 429])
  })

  test('MiddlewareFactory.rateLimit', async () => {
    expect(await codesFor(MiddlewareFactory.rateLimit({ maxRequests: 2, windowMs: 60_000 }), 3)).toEqual([200, 200, 429])
  })
})

describe('over a real socket', () => {
  const router = new Router({ verbose: false })
  let base = ''
  let server: Awaited<ReturnType<Router['serve']>> | undefined

  const direct = new Security({
    ipFiltering: { enabled: true, whitelist: [ALLOWED] },
    // As if this port faced the internet: no proxy in front, so no header counts.
    clientAddress: { trustedProxies: [] },
  })
  const peerKeyed = new DDoSProtection({ maxRequestsPerMinute: 2, burstLimit: 100, trustProxy: false })

  beforeAll(async () => {
    router.get('/who', (r: EnhancedRequest) => Response.json({
      ip: r.ip(),
      untrusted: r.ip({ trustedProxies: [] }),
      ips: r.ips(),
      fromProxy: r.isFromTrustedProxy(),
      fromListedProxy: r.isFromTrustedProxy(['192.0.2.0/24']),
    }))
    router.get('/guarded', (r: EnhancedRequest) => direct.handle(r, ok))
    router.get('/limited', (r: EnhancedRequest) => peerKeyed.handle(r, ok))
    server = await router.serve({ port: 0, hostname: '127.0.0.1' })
    base = `http://127.0.0.1:${server.port}`
  })

  afterAll(() => {
    peerKeyed.destroy()
    server?.stop(true)
  })

  test('the macros read the socket peer', async () => {
    const body = await (await fetch(`${base}/who`, { headers: { 'x-forwarded-for': `${SPOOF}, ${VISITOR}` } })).json()
    expect(body).toEqual({
      // The loopback peer is a trusted proxy, so the hop it appended counts...
      ip: VISITOR,
      // ...and an untrusted peer is the client, whatever it claims.
      untrusted: '127.0.0.1',
      ips: [VISITOR, '127.0.0.1'],
      fromProxy: true,
      fromListedProxy: false,
    })
  })

  test('a client reaching the port directly cannot claim a whitelisted address', async () => {
    const res = await fetch(`${base}/guarded`, { headers: { 'x-forwarded-for': ALLOWED, 'cf-connecting-ip': ALLOWED } })
    expect(res.status).toBe(403)
  })

  test('trustProxy: false keys DDoS protection on the peer alone', async () => {
    const codes: number[] = []
    for (let i = 0; i < 4; i++)
      codes.push((await fetch(`${base}/limited`, { headers: { 'x-forwarded-for': `198.18.4.${i}` } })).status)
    expect(codes).toEqual([200, 200, 200, 429])
  })
})
