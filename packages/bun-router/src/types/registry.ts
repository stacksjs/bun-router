import type { BuiltInMiddleware } from '../types'

/**
 * What an application tells the router about itself.
 *
 * A router deals in strings that are really identifiers: `'Actions/CreateUser'`
 * names a file, `'auth'` names a middleware, `'users.show'` names a route. The
 * compiler has no idea which of them exist, so a typo in any of the three is a
 * runtime error at best — a silently unprotected endpoint at worst, when the
 * typo is in a middleware alias.
 *
 * The router cannot know them either. The application can, so it says so, by
 * augmenting this interface:
 *
 * ```ts
 * // types/router.d.ts
 * declare module '@stacksjs/bun-router' {
 *   interface RouterTypeRegistry {
 *     actions: 'Actions/CreateUser' | 'Actions/ListUsers'
 *     middleware: 'auth' | 'throttle' | 'signed'
 *     routes: {
 *       'users.index': '/users'
 *       'users.show': '/users/{id}'
 *     }
 *   }
 * }
 * ```
 *
 * From then on, `router.post('/users', 'Actions/CreateUsr')` is a compile
 * error, so is `.middleware('atuh')`, and `url('users.show')` demands an `id`
 * because the path says it has one.
 *
 * ## Nothing is required
 *
 * Every key is independent, and every one falls back to exactly the type it had
 * before this existed when it is absent. An application that declares none of
 * them sees no change at all. That is the point: this cannot be a breaking
 * change, and it cannot be a thing you must do before the router is usable.
 *
 * ## Generating it
 *
 * The three unions are facts a build step already knows. A framework on top of
 * this router that scans `app/Actions/` or a middleware alias map can emit the
 * augmentation into a `.d.ts` and the whole surface types itself with nothing
 * hand-written. Writing it by hand works just as well for a smaller app.
 */
// eslint-disable-next-line ts/no-empty-object-type -- augmentation target; empty by design
export interface RouterTypeRegistry {}

/**
 * Read a key out of the registry, or fall back.
 *
 * `K extends keyof RouterTypeRegistry` is `never extends never` — false — while
 * the interface is empty, which is what makes every fallback the default. The
 * second check keeps a malformed augmentation (say, `actions: number`) from
 * poisoning the type: it falls back rather than producing something unusable.
 */
export type FromRegistry<TKey extends string, TFallback>
  = TKey extends keyof RouterTypeRegistry
    ? (RouterTypeRegistry[TKey] extends TFallback ? RouterTypeRegistry[TKey] : TFallback)
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
export type KnownMiddlewareName = FromRegistry<'middleware', string>

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
export type KnownRoutes = FromRegistry<'routes', Record<string, string>>

/** The names of those routes, or any string when none are declared. */
export type KnownRouteName = keyof KnownRoutes extends never ? string : Extract<keyof KnownRoutes, string>

/** The path a declared route name resolves to, or any path when it is not declared. */
export type PathForRouteName<TName extends string>
  = TName extends keyof KnownRoutes ? Extract<KnownRoutes[TName], string> : string
