import type { RouterTypeRegistry } from '../index'
import type { BuiltInMiddleware } from '../types'

/**
 * Reading what the application declared. The interface itself lives in
 * `../index`, which is the module an application can name in a
 * `declare module '@stacksjs/bun-router'` augmentation - see the note there.
 */

/**
 * Read a key out of the registry, or fall back.
 *
 * `TKey extends keyof RouterTypeRegistry` is false while the interface is
 * empty, which is what makes every fallback the default.
 *
 * `TShape` is checked separately from `TFallback`, and the distinction is
 * load-bearing. It used to test the declared value against the fallback itself,
 * which sounds like the same thing and is not: the fallback for an action path
 * is the loose pattern `Actions/${string}Action`, and a real application's
 * action list contains names like `'Actions/Dashboard/Library/GetFunctions'`
 * that do not match it. So a correct, complete declaration failed the guard and
 * fell back to the pattern - the feature looked wired up and checked nothing.
 * The guard is meant to catch `actions: number`, so it asks whether the
 * declared value is a string, and nothing more.
 */
export type FromRegistry<TKey extends string, TShape, TFallback>
  = TKey extends keyof RouterTypeRegistry
    ? (RouterTypeRegistry[TKey] extends TShape ? RouterTypeRegistry[TKey] : TFallback)
    : TFallback

/**
 * The action paths this application has, or the shape of one when it has not
 * said.
 *
 * The fallback is the pattern that was here before: anything under `Actions/`
 * ending in `Action`, or a `Controller@method` reference. It catches a shape
 * mistake and nothing else, which is why declaring the real set is worth doing.
 */
export type KnownActionPath = FromRegistry<
  'actions',
  string,
  `Actions/${string}Action` | `actions/${string}Action` | `${string}Controller@${string}`
>

/**
 * The middleware aliases this application registers, or any string.
 *
 * Middleware group names belong here too: a group name is a middleware
 * reference as far as a call site is concerned - `.middleware('web')` expands
 * to the group - so the union has to contain both or the group form stops
 * type-checking the moment anything is declared.
 */
export type KnownMiddlewareName = FromRegistry<'middleware', string, string>

/**
 * A middleware reference: an alias, or an alias with parameters.
 *
 * `'throttle:60,1'` and `'can:view,post'` are how parameters are passed, so a
 * declared alias has to keep accepting its parameterised form.
 *
 * The built-ins are always allowed alongside whatever the application declares.
 * An app listing its own aliases is saying "these are mine", not "the ones this
 * package ships no longer exist" - and the router's own default middleware
 * groups are built from them, so narrowing them away would make the package
 * fail to describe itself.
 */
export type MiddlewareReference =
  | BuiltInMiddleware
  | `${BuiltInMiddleware}:${string}`
  | KnownMiddlewareName
  | `${KnownMiddlewareName}:${string}`

/** The named routes this application registers, as `name → path`. */
export type KnownRoutes = FromRegistry<'routes', Record<string, string>, Record<string, string>>

/** The names of those routes, or any string when none are declared. */
export type KnownRouteName = keyof KnownRoutes extends never ? string : Extract<keyof KnownRoutes, string>

/** The path a declared route name resolves to, or any path when it is not declared. */
export type PathForRouteName<TName extends string>
  = TName extends keyof KnownRoutes ? Extract<KnownRoutes[TName], string> : string
