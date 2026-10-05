import type { EnhancedRequest } from '../src/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { clientAddress, normalizeAddress, peerAddress } from '../src/request/client-address'
import { Router } from '../src/router'
import { createRateLimitMiddleware, parseThrottleString } from '../src/routing/route-throttling'

const CF_EDGE = '172.70.1.9' // inside 172.64.0.0/13
const VISITOR = '203.0.113.7'
const SPOOF = '198.51.100.1'

function req(headers: Record<string, string>): Request {
  return new Request('http://localhost/', { headers })
}

describe('clientAddress with no socket peer (in-process request)', () => {
  test('reads the nearest untrusted forwarding hop, not the first one', () => {
    expect(clientAddress(req({ 'x-forwarded-for': `${SPOOF}, ${VISITOR}` }))).toBe(VISITOR)
    expect(clientAddress(req({ 'x-forwarded-for': VISITOR }))).toBe(VISITOR)
  })

  test('skips trusted private-network proxies when walking the chain', () => {
    expect(clientAddress(req({ 'x-forwarded-for': `${VISITOR}, 10.0.0.2, 127.0.0.1` }))).toBe(VISITOR)
  })

  test('falls back to X-Real-IP, then to nothing', () => {
    expect(clientAddress(req({ 'x-real-ip': VISITOR }))).toBe(VISITOR)
    expect(clientAddress(req({}))).toBeNull()
  })

  test('believes CF-Connecting-IP only when the delivering hop is Cloudflare', () => {
    expect(clientAddress(req({ 'x-forwarded-for': CF_EDGE, 'cf-connecting-ip': VISITOR }))).toBe(VISITOR)
    expect(clientAddress(req({ 'x-forwarded-for': SPOOF, 'cf-connecting-ip': VISITOR }))).toBe(SPOOF)
    expect(clientAddress(req({ 'x-forwarded-for': CF_EDGE, 'cf-connecting-ip': VISITOR }), { cloudflare: false })).toBe(CF_EDGE)
    expect(clientAddress(req({ 'x-forwarded-for': CF_EDGE, 'cf-connecting-ip': 'not-an-ip' }))).toBe(CF_EDGE)
  })

  test('IPv6 Cloudflare edges count too', () => {
    expect(clientAddress(req({ 'x-forwarded-for': '2606:4700:10::ac43:1', 'cf-connecting-ip': '2001:db8::5' }))).toBe('2001:db8::5')
  })
})

describe('normalizeAddress', () => {
  test('strips ports, brackets and the IPv4-mapped prefix', () => {
    expect(normalizeAddress(' 1.2.3.4:5678 ')).toBe('1.2.3.4')
    expect(normalizeAddress('[2001:db8::1]:443')).toBe('2001:db8::1')
    expect(normalizeAddress('::ffff:127.0.0.1')).toBe('127.0.0.1')
    expect(normalizeAddress('2001:db8::1')).toBe('2001:db8::1')
    expect(normalizeAddress('x'.repeat(200)).length).toBe(64)
  })
})

describe('over a real socket', () => {
  const router = new Router({ verbose: false })
  let base = ''
  let server: Awaited<ReturnType<Router['serve']>> | undefined

  const throttled = createRateLimitMiddleware(parseThrottleString('2,1'), 'client-address-test')
  const untrustingLimiter = createRateLimitMiddleware(
    { ...parseThrottleString('2,1'), clientAddress: { trustedProxies: [] } },
    'client-address-test-untrusting',
  )

  beforeAll(async () => {
    router.get('/who', (r: EnhancedRequest) => Response.json({
      peer: peerAddress(r),
      trusted: clientAddress(r),
      untrusted: clientAddress(r, { trustedProxies: [] }),
    }))
    router.get('/limited', async (r: EnhancedRequest) => {
      const blocked = await throttled(r, async () => null)
      return blocked ?? new Response('ok')
    })
    router.get('/limited-direct', async (r: EnhancedRequest) => {
      const blocked = await untrustingLimiter(r, async () => null)
      return blocked ?? new Response('ok')
    })
    server = await router.serve({ port: 0, hostname: '127.0.0.1' })
    base = `http://127.0.0.1:${server.port}`
  })

  afterAll(() => {
    server?.stop(true)
  })

  test('the socket peer is read from the server', async () => {
    const body = await (await fetch(`${base}/who`, { headers: { 'x-forwarded-for': SPOOF } })).json() as { peer: string, trusted: string, untrusted: string }
    expect(body.peer).toBe('127.0.0.1')
    // A loopback peer is a trusted proxy, so its header is believed...
    expect(body.trusted).toBe(SPOOF)
    // ...and a peer that is not trusted IS the client, whatever it claims.
    expect(body.untrusted).toBe('127.0.0.1')
  })

  test('a client cannot buy a fresh budget by prefixing X-Forwarded-For', async () => {
    const codes: number[] = []
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${base}/limited`, { headers: { 'x-forwarded-for': `198.18.0.${i}, ${VISITOR}` } })
      codes.push(res.status)
    }
    expect(codes).toEqual([200, 200, 429])
  })

  test('on a public port, headers are ignored and the peer is the key', async () => {
    const codes: number[] = []
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${base}/limited-direct`, { headers: { 'x-forwarded-for': `198.18.1.${i}`, 'cf-connecting-ip': `198.18.2.${i}` } })
      codes.push(res.status)
    }
    expect(codes).toEqual([200, 200, 429])
  })
})

describe('rate limiter keys', () => {
  test('authenticated users each get their own budget behind one address', async () => {
    const limiter = createRateLimitMiddleware(parseThrottleString('1,1'))
    const as = (id: number) => Object.assign(req({ 'x-forwarded-for': VISITOR }), { user: { id } }) as unknown as EnhancedRequest
    expect(await limiter(as(1), async () => null)).toBeNull()
    expect(await limiter(as(2), async () => null)).toBeNull()
    const again = await limiter(as(1), async () => null)
    expect(again?.status).toBe(429)
  })

  test('visitors behind one Cloudflare edge do not share a budget', async () => {
    const limiter = createRateLimitMiddleware(parseThrottleString('1,1'))
    const via = (visitor: string) => req({ 'x-forwarded-for': CF_EDGE, 'cf-connecting-ip': visitor }) as unknown as EnhancedRequest
    expect(await limiter(via('203.0.113.10'), async () => null)).toBeNull()
    expect(await limiter(via('203.0.113.11'), async () => null)).toBeNull()
    expect((await limiter(via('203.0.113.10'), async () => null))?.status).toBe(429)
  })
})
