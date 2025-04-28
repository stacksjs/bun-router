import type { RouteDefinition } from '../../src/types'

/**
 * This file is the entry point for your application's API routes.
 * The routes defined here are automatically registered with the /api prefix.
 * API routes typically handle JSON requests and responses.
 */

const routes: RouteDefinition[] = [
  {
    path: '/users',
    handler: 'Actions/User/IndexAction',
    method: 'GET',
    middleware: ['Middleware/Auth']
  },
  {
    path: '/users/{id}',
    handler: 'Actions/User/ShowAction',
    method: 'GET',
    middleware: ['Middleware/Auth']
  },
  {
    path: '/users',
    handler: 'Actions/User/StoreAction',
    method: 'POST',
    middleware: ['Middleware/Auth']
  },
  {
    path: '/auth/login',
    handler: 'Actions/Auth/LoginAction',
    method: 'POST'
  },
  {
    path: '/auth/register',
    handler: 'Actions/Auth/RegisterAction',
    method: 'POST'
  }
]

export default routes