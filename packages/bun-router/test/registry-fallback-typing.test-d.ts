/**
 * What an application that declares NOTHING sees.
 *
 * Which is most of them, and it is the case a registry feature is most likely
 * to break: it is easy to check that a declared union bites, and easy to forget
 * that the un-declared default has to keep compiling exactly as it did before.
 *
 * This file deliberately does NOT augment `RouterTypeRegistry`. It lives under
 * the main tsconfig for that reason - `registry-typing.test-d.ts`, which does
 * augment, is compiled separately, because a `declare module` is global and
 * would otherwise narrow this file too.
 */

import { Router, url } from '../src'

const router = new Router()

// ── action paths fall back to the shape check ─────────────────────────────

router.post('/users', 'Actions/AnythingAtAllAction')
router.get('/users', 'actions/lowercaseIsFineAction')
router.get('/c', 'UserController@index')

export function shapeStillChecked(): void {
  // @ts-expect-error not an action path in any shape
  router.get('/x', 'just-a-string')

  // @ts-expect-error under `Actions/` but not suffixed `Action`
  router.get('/y', 'Actions/CreateUser')
}

// ── middleware falls back to any string ───────────────────────────────────

router.get('/m', () => new Response('ok'), 'web', 'm', ['anything-goes'])
router.get('/m2', () => new Response('ok'), 'web', 'm2', ['throttle:60,1'])
// The built-ins are always accepted, declared registry or not.
router.get('/m3', () => new Response('ok'), 'web', 'm3', ['security', 'json_body', 'request_id'])

// ── url() falls back to any name, with free-form params ───────────────────

export const anyName: string = url('whatever.name')
export const withParams: string = url('whatever.name', { id: 1, tab: 'x' })
export const absolute: string = url('whatever.name', {}, { absolute: true })
