import { describe, expect, it } from 'bun:test'
import { Router } from '../src/router'

/**
 * `req.cookies` is dual-shape: callable (the legacy macro form returning
 * the parsed map), a direct name→value map, and the get/set/delete/getAll
 * utility. It materializes lazily via a shared-prototype accessor.
 */
describe('request cookies dual shape', () => {
  const router = new Router()
  const enhance = (headers: Record<string, string> = {}) =>
    router.enhanceRequest(new Request('http://localhost/x', { headers }), {})

  it('supports map access, utility methods and the callable form', () => {
    const req = enhance({ cookie: 'session=abc123; theme=dark' })

    // Direct map access
    expect((req.cookies as any).session).toBe('abc123')
    // Utility form
    expect((req.cookies as any).get('theme')).toBe('dark')
    expect((req.cookies as any).getAll()).toEqual({ session: 'abc123', theme: 'dark' })
    // Legacy callable form
    expect((req.cookies as any)()).toEqual({ session: 'abc123', theme: 'dark' })
  })

  it('queues set/delete for the response and tolerates malformed values', () => {
    const req = enhance({ cookie: 'weird=%E0%A4%A; ok=1' })

    expect((req.cookies as any).get('ok')).toBe('1')
    // Malformed percent-encoding falls back to the raw value
    expect((req.cookies as any).get('weird')).toBe('%E0%A4%A')
    ;(req.cookies as any).set('a', 'b', { httpOnly: true })
    ;(req.cookies as any).delete('old')
    expect(req._cookiesToSet).toHaveLength(1)
    expect(req._cookiesToDelete).toHaveLength(1)
  })

  it('assignment still shadows the accessor (testing utilities set req.cookies)', () => {
    const req = enhance()
    ;(req as any).cookies = { custom: 'value' }
    expect((req.cookies as any).custom).toBe('value')
  })
})
