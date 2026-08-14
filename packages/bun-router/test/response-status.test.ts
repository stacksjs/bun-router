/**
 * `ResponseStatus` is narrow to catch typos, not to decide which parts of HTTP
 * an application may speak.
 *
 * It used to omit 413, so an upload endpoint refusing an oversized body could
 * not say so without an `as any`, and 402, which any metered or paid API needs.
 * A missing status is a type error on correct code, and the workaround it
 * pushes people toward disables the checking for that whole call.
 */

import type { ResponseStatus } from '../src/types'
import { describe, expect, test } from 'bun:test'
import { response } from '../src/response/response-factory'

describe('ResponseStatus covers the codes handlers actually return', () => {
  test('accepts the payload and media type codes an upload endpoint needs', () => {
    const codes: ResponseStatus[] = [411, 413, 414, 415, 416]
    expect(codes).toHaveLength(5)
  })

  test('accepts 402, for metered and paid APIs', () => {
    const paymentRequired: ResponseStatus = 402
    expect(paymentRequired).toBe(402)
  })

  test('accepts the codes that distinguish gone, stale and precondition failures', () => {
    const codes: ResponseStatus[] = [406, 408, 410, 412, 423, 425, 426, 428, 431, 451]
    expect(codes).toHaveLength(10)
  })

  test('accepts the fuller success and server ranges', () => {
    const success: ResponseStatus[] = [203, 205, 206]
    const server: ResponseStatus[] = [501, 505, 507, 511]
    expect([...success, ...server]).toHaveLength(7)
  })

  test('the codes it already had still typecheck', () => {
    const existing: ResponseStatus[] = [200, 201, 202, 204, 301, 302, 304, 400, 401, 403, 404, 405, 409, 422, 429, 500, 502, 503, 504]
    expect(existing).toHaveLength(19)
  })
})

describe('the response factory emits them', () => {
  test('json() carries a 413 through to the Response', async () => {
    const res = response.json({ error: 'payload_too_large' }, 413)

    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ error: 'payload_too_large' })
  })

  test('json() takes a status alongside headers, which is how Retry-After ships', () => {
    const res = response.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '7' } })

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('7')
  })
})
