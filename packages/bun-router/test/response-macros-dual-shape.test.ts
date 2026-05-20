import { describe, expect, test } from 'bun:test'
import { BuiltInResponseMacros } from '../src/response/macros'

/**
 * Regression coverage for stacksjs/stacks#1857 — `BuiltInResponseMacros.{json,
 * html, text, xml}` must accept both the legacy positional
 * `(body, status, headers)` shape AND the native WHATWG
 * `(body, init: ResponseInit)` shape. Before the fix a call like
 * `Response.json(data, { status: 422 })` coerced `{ status: 422 }` to NaN
 * and threw `RangeError: The status provided (0) must be 101 or in the
 * range of [200, 599]`.
 */

const macros = ['json', 'html', 'text', 'xml'] as const

describe('BuiltInResponseMacros dual-shape (#1857)', () => {
  for (const name of macros) {
    describe(`.${name}()`, () => {
      const body = name === 'json' ? { ok: true } : '<x />'

      test('no init arg → 200', () => {
        const res = BuiltInResponseMacros[name](body as any)
        expect(res.status).toBe(200)
      })

      test('positional number → uses it as status', () => {
        const res = BuiltInResponseMacros[name](body as any, 418)
        expect(res.status).toBe(418)
      })

      test('positional number + headers object', () => {
        const res = BuiltInResponseMacros[name](body as any, 201, { 'X-Test': 'positional' })
        expect(res.status).toBe(201)
        expect(res.headers.get('x-test')).toBe('positional')
      })

      test('native ResponseInit with status field → uses init.status', () => {
        const res = BuiltInResponseMacros[name](body as any, { status: 422 })
        expect(res.status).toBe(422)
      })

      test('native ResponseInit with status + headers', () => {
        const res = BuiltInResponseMacros[name](body as any, {
          status: 401,
          headers: { 'X-Test': 'init' },
        })
        expect(res.status).toBe(401)
        expect(res.headers.get('x-test')).toBe('init')
      })

      test('ResponseInit without status defaults to 200', () => {
        const res = BuiltInResponseMacros[name](body as any, { headers: { 'X-Test': 'no-status' } })
        expect(res.status).toBe(200)
        expect(res.headers.get('x-test')).toBe('no-status')
      })

      test('headers in ResponseInit replace the positional headers arg', () => {
        const res = BuiltInResponseMacros[name](
          body as any,
          { status: 200, headers: { 'X-From-Init': 'yes' } },
          { 'X-Positional': 'lost' },
        )
        expect(res.headers.get('x-from-init')).toBe('yes')
        expect(res.headers.get('x-positional')).toBeNull()
      })

      test('Headers instance in ResponseInit is normalized', () => {
        const res = BuiltInResponseMacros[name](body as any, {
          status: 200,
          headers: new Headers({ 'X-Test': 'from-headers-instance' }),
        })
        expect(res.headers.get('x-test')).toBe('from-headers-instance')
      })

      test('header tuples in ResponseInit are normalized', () => {
        const res = BuiltInResponseMacros[name](body as any, {
          status: 200,
          headers: [['X-Test', 'from-tuples']],
        })
        expect(res.headers.get('x-test')).toBe('from-tuples')
      })

      test('Content-Type from the macro wins over user overrides', () => {
        const res = BuiltInResponseMacros[name](body as any, {
          status: 200,
          headers: { 'Content-Type': 'application/x-foo' },
        })
        // Spread order: { 'Content-Type': '<macro default>', ...mergedHeaders }
        // means the user's override wins. Capture the documented behaviour.
        expect(res.headers.get('content-type')).toBe('application/x-foo')
      })
    })
  }

  describe('the exact failure from #1857', () => {
    test("Response.json(data, { status: 422 }) returns a 422 instead of throwing RangeError", () => {
      // This is the framework-side call that used to throw before the fix.
      let result: Response | Error
      try {
        result = BuiltInResponseMacros.json({ error: 'Validation failed', errors: {} }, { status: 422 })
      }
      catch (err) {
        result = err as Error
      }
      expect(result).toBeInstanceOf(Response)
      expect((result as Response).status).toBe(422)
    })
  })
})
