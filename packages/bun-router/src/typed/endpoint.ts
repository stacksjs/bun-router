/**
 * Reading a handler's input and output types.
 *
 * A typed route map is only as good as what can be inferred about the handler
 * behind it, and handlers come in more than one shape. Three are understood
 * here, in order:
 *
 *   1. A plain function. Its return type is the output; the input is unknown,
 *      because a function that reads `req.body` says nothing about what it
 *      expects to find there.
 *   2. An object with `handle()`. Same output inference, and if it also
 *      carries a `validations` map, the input comes from that - the same
 *      object the validator runs, so the two cannot drift.
 *   3. Anything declaring an explicit `__input` phantom, which wins over
 *      `validations`. The escape hatch for a handler that validates somewhere
 *      this cannot see.
 *
 * Shape 2 is why a framework built on this router does not need its own
 * builder: an "action" with `handle` and `validations` is structurally exactly
 * what this reads.
 */

/** A validation rule, as `validations` maps are written. */
export interface TypedRule<T = unknown> {
  /**
   * Names the value the rule accepts. Matches the `Validator<T>` shape that
   * ts-validation (and anything else with a `test(value: T)` predicate) uses,
   * which is how the input type is read without depending on a validator
   * library.
   */
  test?: (value: T) => boolean
  validate: (value: any) => any
}

/** A `validations:` map: one rule per field, optionally with a message. */
export type TypedValidations = Record<string, { rule: TypedRule<any>, message?: unknown }>

/** What a single rule accepts. */
type RuleInput<R> = R extends { test: (value: infer T) => boolean } ? T : unknown

/** The body shape a `validations` map describes. */
export type InputOfValidations<V> = V extends TypedValidations
  ? { [K in keyof V]: RuleInput<V[K]['rule']> }
  : Record<string, unknown>

/**
 * What a client has to send to reach this handler.
 *
 * An explicit `__input` wins; otherwise `validations`; otherwise unknown-ish,
 * which is the honest answer rather than a guess.
 */
export type InputOf<H>
  = H extends { __input?: infer I }
    ? ([I] extends [undefined] ? InputOfHandlerValidations<H> : NonNullable<I>)
    : InputOfHandlerValidations<H>

/*
 * Matched as OPTIONAL on purpose.
 *
 * `H extends { validations: infer V }` only matches a handler whose
 * `validations` is a required property. An action class that declares
 * `validations?: TValidations` - which is the normal way to write one, since
 * plenty of actions have none - failed that check and fell through to
 * "accepts anything", silently. The failure mode is the worst kind: the client
 * still compiles, and every wrong body it sends compiles too.
 */
type InputOfHandlerValidations<H> = H extends { validations?: infer V }
  ? ([V] extends [undefined] ? Record<string, unknown> : InputOfValidations<NonNullable<V>>)
  : Record<string, unknown>

/**
 * What a client gets back.
 *
 * A handler that returns a `Response` or a stream has taken over the wire
 * format itself, so its shape is genuinely unknown here - saying so is more
 * useful than pretending the client knows.
 */
export type OutputOf<H>
  = H extends { handle: (..._args: any[]) => infer R }
    ? NormalizeOutput<Awaited<R>>
    : (H extends (..._args: any[]) => infer R ? NormalizeOutput<Awaited<R>> : unknown)

type NormalizeOutput<R> = [R] extends [Response | ReadableStream] ? unknown : R

/** Anything this module can read types out of. */
export type TypedHandlerLike =
  | ((..._args: any[]) => any)
  | { handle: (..._args: any[]) => any }

/**
 * Declare a handler's input and output explicitly.
 *
 * For the case shape 1 cannot cover: a plain function that validates its own
 * body, where the router has no `validations` map to read. The returned value
 * is the same function with an `__input` phantom attached, so it registers
 * exactly as it would have.
 *
 * @example
 * const createUser = defineEndpoint<{ name: string }, { id: number }>(async (req) => {
 *   const body = await req.json()
 *   return { id: 1 }
 * })
 */
export function defineEndpoint<TInput, TOutput>(
  handle: (..._args: any[]) => TOutput | Promise<TOutput>,
): ((..._args: any[]) => TOutput | Promise<TOutput>) & { __input?: TInput } {
  return handle
}
