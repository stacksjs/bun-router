import type { EnhancedRequest } from '../src/types'
import { describe, expect, test } from 'bun:test'
import { RequestHelpers } from '../src/request/macros'

describe('request.rawBody()', () => {
  test('returns the exact unparsed body bytes', async () => {
    const payload = '{"id":"evt_1","type":"checkout.session.completed"}'
    const req = RequestHelpers.withMacros(new Request('http://x/webhooks/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }) as EnhancedRequest)

    expect(await req.rawBody()).toBe(payload)
  })

  test('caches so repeated reads return the same bytes', async () => {
    const payload = 'raw-payload'
    const req = RequestHelpers.withMacros(new Request('http://x/y', {
      method: 'POST',
      body: payload,
    }) as EnhancedRequest)

    expect(await req.rawBody()).toBe(payload)
    // Second read must not attempt to re-consume the (already-read) stream.
    expect(await req.rawBody()).toBe(payload)
  })

  test('honors a pre-populated _rawBody cache (framework body parser path)', async () => {
    const req = RequestHelpers.withMacros(new Request('http://x/y', {
      method: 'POST',
      body: 'stream-bytes',
    }) as EnhancedRequest)
    // A framework parser that already read the body stashes the exact bytes so
    // signature verification gets them without re-reading a consumed stream.
    req._rawBody = 'exact-parser-bytes'

    expect(await req.rawBody()).toBe('exact-parser-bytes')
  })

  test('returns empty string for a body-less request', async () => {
    const req = RequestHelpers.withMacros(new Request('http://x/y') as EnhancedRequest)
    expect(await req.rawBody()).toBe('')
  })
})
