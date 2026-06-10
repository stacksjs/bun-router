import type { ActionHandler, RouteGroup } from '../types'
import type { Router } from './router'
import { joinPaths } from '../utils'

/**
 * Route grouping and organization extension for Router class
 */
export function registerGroupOrganization(RouterClass: typeof Router): void {
  Object.defineProperties(RouterClass.prototype, {
    /**
     * Create a route group with shared attributes
     */
    group: {
      value(options: RouteGroup, callback: () => void): Router {
        // Save the current group if there is one
        const previousGroup = this.currentGroup

        // Create a new group by merging with previous group
        const newGroup: RouteGroup = { ...previousGroup }

        // Handle prefix nesting
        if (options.prefix && previousGroup?.prefix) {
          newGroup.prefix = joinPaths(previousGroup.prefix, options.prefix)
        }
        else if (options.prefix) {
          newGroup.prefix = options.prefix
        }

        // Merge middleware
        if (options.middleware) {
          newGroup.middleware = [
            ...(previousGroup?.middleware || []),
            ...options.middleware,
          ]
        }

        // Set the new group
        this.currentGroup = newGroup

        // Execute the callback to register routes in this group
        const result = callback() as unknown

        // Async callbacks (e.g. `register()`'s dynamic import) register
        // their routes after this call returns — the group must stay
        // active until the promise settles, and callers must await.
        if (result instanceof Promise) {
          return result.then(
            () => {
              this.currentGroup = previousGroup
              return this
            },
            (error: unknown) => {
              this.currentGroup = previousGroup
              throw error
            },
          ) as unknown as Router
        }

        // Restore the previous group
        this.currentGroup = previousGroup

        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Create a route group with a name prefix
     */
    name: {
      value(prefix: string, callback: () => void): Router {
        // Save previous group
        const previousGroup = this.currentGroup || {}

        // Create a new group with the name prefix
        const newGroup: RouteGroup = { ...previousGroup }
        this.currentGroup = newGroup

        // Keep track of routes before the callback
        const routeCountBefore = this.routes.length

        // Execute the callback to register routes
        callback()

        // Apply name prefix to newly added routes
        for (let i = routeCountBefore; i < this.routes.length; i++) {
          const route = this.routes[i]
          if (route.name) {
            route.name = `${prefix}.${route.name}`
          }
        }

        // Restore previous group
        this.currentGroup = previousGroup

        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Create a route group with a controller
     */
    controller: {
      value(controller: string | (new () => any), callback: () => void): Router {
        // Save previous group
        const previousGroup = this.currentGroup || {}

        // Create a new group with the controller
        const newGroup: RouteGroup = { ...previousGroup, controller }
        this.currentGroup = newGroup

        // Execute the callback to register routes
        callback()

        // Restore previous group
        this.currentGroup = previousGroup

        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Create a route group with a domain
     */
    domain: {
      value(domain: string, callback: () => void): Router {
        // Save previous domain
        const previousDomain = this.currentDomain

        // Set the new domain
        this.currentDomain = domain

        // Execute the callback to register routes
        callback()

        // Restore previous domain
        this.currentDomain = previousDomain

        return this
      },
      writable: true,
      configurable: true,
    },

    /**
     * Create a route group with a prefix
     */
    prefix: {
      value(prefix: string, callback: () => void): Router {
        return this.group({ prefix }, callback)
      },
      writable: true,
      configurable: true,
    },

    /**
     * Create RESTful resource routes
     */
    resource: {
      value(
        name: string,
        handler: string | { [key: string]: ActionHandler },
        type: 'api' | 'web' = 'api',
      ): Router {
        // Normalize the name to build paths
        const pluralName = name.endsWith('s') ? name : `${name}s`
        const singularName = name.endsWith('s') ? name.slice(0, -1) : name

        // Define the routes to create
        const routes = [
          { name: 'index', method: 'GET', path: `/${pluralName}`, action: 'index' },
          { name: 'create', method: 'GET', path: `/${pluralName}/create`, action: 'create' },
          { name: 'store', method: 'POST', path: `/${pluralName}`, action: 'store' },
          { name: 'show', method: 'GET', path: `/${pluralName}/{id}`, action: 'show' },
          { name: 'edit', method: 'GET', path: `/${pluralName}/{id}/edit`, action: 'edit' },
          { name: 'update', method: 'PUT', path: `/${pluralName}/{id}`, action: 'update' },
          { name: 'destroy', method: 'DELETE', path: `/${pluralName}/{id}`, action: 'destroy' },
        ]

        // Use the name prefix for route names
        this.name(singularName, () => {
          for (const route of routes) {
            let routeHandler: ActionHandler

            if (typeof handler === 'string') {
              // If handler is a string, use it as a prefix for the action
              routeHandler = `${handler}${route.action.charAt(0).toUpperCase() + route.action.slice(1)}Action` as any
            }
            else {
              // If handler is an object, get the action handler from it
              if (handler[route.action]) {
                routeHandler = handler[route.action]
              }
              else {
                // Skip this route if no handler is defined
                continue
              }
            }

            // Register the route with the appropriate HTTP method
            switch (route.method) {
              case 'GET':
                this.get(route.path, routeHandler, type, route.name)
                break
              case 'POST':
                this.post(route.path, routeHandler, type, route.name)
                break
              case 'PUT':
                this.put(route.path, routeHandler, type, route.name)
                break
              case 'DELETE':
                this.delete(route.path, routeHandler, type, route.name)
                break
            }
          }
        })

        return this
      },
      writable: true,
      configurable: true,
    },
  })
}
