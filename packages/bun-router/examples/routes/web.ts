import type { RouteDefinition } from '../../src/types'

/**
 * This file is the entry point for your application's web routes.
 * The routes defined here are automatically registered without any prefix.
 * Web routes typically handle HTML responses and form submissions.
 */

const routes: RouteDefinition[] = [
  {
    path: '/',
    handler: 'Actions/Home/IndexAction',
    method: 'GET'
  },
  {
    path: '/about',
    handler: 'Actions/Home/AboutAction',
    method: 'GET'
  },
  {
    path: '/contact',
    handler: 'Actions/Home/ContactAction',
    method: 'GET'
  },
  {
    path: '/dashboard',
    handler: 'Actions/Dashboard/IndexAction',
    method: 'GET',
    middleware: ['Middleware/Auth', 'Middleware/VerifyEmail']
  },
  {
    path: '/settings',
    handler: 'Actions/Dashboard/SettingsAction',
    method: 'GET',
    middleware: ['Middleware/Auth', 'Middleware/VerifyEmail']
  }
]

export default routes