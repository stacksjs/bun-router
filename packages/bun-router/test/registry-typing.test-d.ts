/**
 * What an application gets once it declares its own surface.
 *
 * `'Actions/CreateUser'`, `'auth'` and `'users.show'` are identifiers wearing a
 * string's clothes, and the router cannot know which of them exist. The
 * application can, so it says so by augmenting `RouterTypeRegistry`. This file
 * does exactly that, then checks that the three unions actually bite.
 *
 * Checked by `bun run typecheck`; nothing here executes. The augmentation is
 * scoped to this module's compilation, which is why the fallback behaviour has
 * its own file (`registry-empty-typing.test-d.ts`) - one file cannot both
 * declare a registry and prove what happens without one.
 */

import { Router, url } from '../src'

// The entry module, which is what `'@stacksjs/bun-router'` resolves to for an
// application. Augmenting anywhere else creates a second, unrelated interface.
declare module '../src' {
  interface RouterTypeRegistry {
    actions: 'Actions/CreateUserAction' | 'Actions/ListUsersAction'
    middleware: 'auth' | 'throttle'
    routes: {
      'users.index': '/users'
      'users.show': '/users/{id}'
      'posts.show': '/posts/{slug?}'
    }
  }
}

const router = new Router()

// ── action paths ──────────────────────────────────────────────────────────

router.post('/users', 'Actions/CreateUserAction')
router.get('/users', 'Actions/ListUsersAction')

export function badActions(): void {
  // @ts-expect-error typo: there is no such action
  router.post('/users', 'Actions/CreateUsrAction')

  // @ts-expect-error right shape, still not an action this app has
  router.get('/x', 'Actions/SomeOtherAction')
}

// ── middleware aliases ────────────────────────────────────────────────────

router.get('/dash', () => new Response('ok'), 'web', 'dash', ['auth'])
// Parameterised form of a declared alias.
router.get('/dash2', () => new Response('ok'), 'web', 'dash2', ['throttle:60,1'])

export function badMiddleware(): void {
  // @ts-expect-error typo — and this is the one that silently serves a route
  // unprotected when it is only checked at runtime
  router.get('/admin', () => new Response('ok'), 'web', 'admin', ['atuh'])
}

// ── named routes ──────────────────────────────────────────────────────────

const a: string = url('users.index')
const b: string = url('users.show', { id: 42 })
// Unconsumed keys become the query string, which is a feature.
const c: string = url('users.show', { id: 42, tab: 'profile' })
// An optional path param stays optional.
const d: string = url('posts.show')
const e: string = url('posts.show', { slug: 'hello' }, { absolute: true })

export function badUrls(): void {
  // @ts-expect-error no such route name
  url('users.destroy')

  // @ts-expect-error this route's path declares an `id`
  url('users.show')
}

export const generated: string[] = [a, b, c, d, e]
