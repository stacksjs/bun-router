/**
 * One `request.cookies`, built one way.
 *
 * There were three constructions of this object - one in the router, one in
 * `testing/test-request`, one in `testing/auth-testing` - and the server built
 * a fourth, different one through a macro accessor. Only the macro's was the
 * real shape: callable, carrying the name→value entries directly, AND holding
 * `get`/`set`/`delete`/`getAll`. The other three were plain method bags, so a
 * handler written against a real request (`req.cookies()`, `req.cookies.session`)
 * broke the moment it met a test request, and the declared type described none
 * of them completely.
 *
 * This is the one builder. The differences that are real - where a read comes
 * from, where a write goes - are parameters.
 */

import type { CookieAccessor, CookieOptions } from '../types'

export interface CookieAccessorSinks {
  /** The current cookie map. Called on every read, so it can stay lazy. */
  read: () => Record<string, string>
  /** Where a `set` goes. Omitted, `set` is a no-op. */
  write?: (name: string, value: string, options: CookieOptions) => void
  /** Where a `delete` goes. Omitted, `delete` is a no-op. */
  remove?: (name: string, options: CookieOptions) => void
}

// eslint-disable-next-line pickier/no-unused-vars -- sinks is read by the destructuring assignment below
export function createCookieAccessor(sinks: CookieAccessorSinks): CookieAccessor {
  const { read, write, remove } = sinks
  const accessor = ((): Record<string, string> => ({ ...read() })) as CookieAccessor

  /*
   * `defineProperty` rather than `Object.assign`, because the target is a
   * function: a cookie literally named `name`, `length` or `caller` would
   * collide with the function's own non-writable properties and throw.
   */
  for (const [key, value] of Object.entries(read())) {
    Object.defineProperty(accessor, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  }

  accessor.get = (name: string) => read()[name]
  accessor.set = (name: string, value: string, options: CookieOptions = {}) => write?.(name, value, options)
  accessor.delete = (name: string, options: CookieOptions = {}) => remove?.(name, options)
  accessor.getAll = () => ({ ...read() })

  return accessor
}

/**
 * A cookie accessor backed by a mutable in-memory map.
 *
 * What a test request wants: `set` and `delete` take effect immediately and are
 * visible to the next read, rather than being queued onto a response that does
 * not exist.
 */
export function createInMemoryCookieAccessor(initial: Record<string, string> = {}): CookieAccessor {
  const store = { ...initial }

  return createCookieAccessor({
    read: () => store,
    write: (name, value) => {
      store[name] = value
    },
    remove: (name) => {
      delete store[name]
    },
  })
}
