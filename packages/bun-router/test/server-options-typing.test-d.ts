import { Router } from '../src/router'

const router = new Router()
void router.serve({ port: 0, nativeRoutes: true, development: { console: true } })
void router.serve({ static: { '/health': new Response('ok') } })
// @ts-expect-error nativeRoutes must be a boolean
void router.serve({ nativeRoutes: 'true' })
// @ts-expect-error unknown server options are rejected
void router.serve({ unrecognizedOption: true })
