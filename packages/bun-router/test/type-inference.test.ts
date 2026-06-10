import type { ExtractRouteParams } from '../src/types'
import { describe, expect, it } from 'bun:test'

/**
 * Compile-time checks for the route-param extraction types. Each helper
 * only typechecks when the inferred type matches exactly — a regression
 * in `ExtractRouteParams` fails `bun test` (which typechecks) and
 * `tsc --noEmit`.
 */
type Expect<T extends true> = T
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false

// Simplify intersections like `{ a: string } & { b: string }` for comparison
type Simplify<T> = { [K in keyof T]: T[K] } & {}

describe('ExtractRouteParams', () => {
  it('extracts required, optional, constrained and wildcard params', () => {
    type _Single = Expect<Equal<Simplify<ExtractRouteParams<'/users/{id}'>>, { id: string }>>
    type _Multi = Expect<Equal<
      Simplify<ExtractRouteParams<'/users/{userId}/posts/{postId}'>>,
      { userId: string, postId: string }
    >>
    type _Optional = Expect<Equal<Simplify<ExtractRouteParams<'/posts/{slug?}'>>, { slug?: string }>>
    type _Constrained = Expect<Equal<Simplify<ExtractRouteParams<'/users/{id:[0-9]+}'>>, { id: string }>>
    type _Wildcard = Expect<Equal<Simplify<ExtractRouteParams<'/files/*'>>, { wildcard: string }>>
    type _Static = Expect<Equal<keyof ExtractRouteParams<'/about'>, never>>

    // Mixed: required + optional
    type Mixed = Simplify<ExtractRouteParams<'/a/{x}/b/{y?}'>>
    type _MixedRequired = Expect<Equal<Mixed['x'], string>>
    type _MixedOptional = Expect<Equal<Mixed['y'], string | undefined>>

    // Runtime no-op so the test runner counts this file
    expect(true).toBe(true)
  })
})
