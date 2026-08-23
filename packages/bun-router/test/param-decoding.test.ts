/**
 * Path params arrive decoded, exactly once.
 *
 * The matchers used to store the raw path segment, so `/users/{name}` given
 * `/users/caf%C3%A9` handed the handler the literal `caf%C3%A9`, and a space
 * arrived as `%20`. Every consumer had to decode; every consumer that forgot
 * had a bug.
 *
 * "Exactly once" is the load-bearing half. Decoding here AND in a wrapper turns
 * `%2520` into a space, and a double decode is how a filter that rejects `../`
 * gets walked past - so `@stacksjs/router`, which used to decode on top, no
 * longer does.
 */

import { describe, expect, it } from 'bun:test'
import { Router } from '../src/router'

async function params(routePath: string, requestPath: string): Promise<any> {
  const router = new Router()
  router.get(routePath, (req: any) => Response.json(req.params))
  const res = await router.handleRequest(new Request(`http://localhost${requestPath}`))
  return res.json()
}

describe('path params are decoded', () => {
  it('decodes a space', async () => {
    expect(await params('/f/{name}', '/f/hello%20world')).toEqual({ name: 'hello world' })
  })

  it('decodes multi-byte UTF-8', async () => {
    expect(await params('/f/{name}', '/f/caf%C3%A9')).toEqual({ name: 'café' })
  })

  it('decodes an encoded slash, which is why it was encoded', async () => {
    expect(await params('/f/{name}', '/f/a%2Fb')).toEqual({ name: 'a/b' })
  })

  it('decodes every param of a multi-param path', async () => {
    expect(await params('/p/{a}/{b}', '/p/1%2B2/x%26y')).toEqual({ a: '1+2', b: 'x&y' })
  })

  it('decodes a wildcard per segment, not across it', async () => {
    // Joined AFTER decoding, so an encoded `/` inside one segment cannot
    // become a separator between two.
    expect(await params('/w/*', '/w/x%20y/z')).toEqual({ wildcard: 'x y/z' })
  })
})

describe('decoded exactly once', () => {
  it('leaves a double-encoded sequence encoded once', async () => {
    // NOT ' '. Two decodes would be a filter bypass.
    expect(await params('/f/{name}', '/f/%2520')).toEqual({ name: '%20' })
  })

  it('leaves a double-encoded traversal visible as text', async () => {
    expect(await params('/f/{name}', '/f/%252e%252e%252f')).toEqual({ name: '%2e%2e%2f' })
  })
})

describe('malformed input does not fail the request', () => {
  it('passes a bad escape through raw', async () => {
    // `decodeURIComponent('bad%ZZ')` throws; a 500 before the handler has seen
    // the request would be the wrong answer to a client's typo.
    expect(await params('/f/{name}', '/f/bad%ZZ')).toEqual({ name: 'bad%ZZ' })
  })

  it('passes a truncated escape through raw', async () => {
    expect(await params('/f/{name}', '/f/trailing%')).toEqual({ name: 'trailing%' })
  })
})

describe('constraints see the decoded value', () => {
  it('matches a numeric constraint against the decoded segment', async () => {
    // Testing the raw segment while storing the decoded one would mean the
    // constraint and the handler disagreed about what the segment says.
    expect(await params('/n/{id:\\d+}', '/n/%37')).toEqual({ id: '7' })
  })
})
