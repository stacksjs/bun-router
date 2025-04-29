import { describe, expect, it } from 'bun:test'
import {
  isActionClass,
  isRouteHandler,
  matchPath,
  normalizePath,
  processHtmlTemplate
} from '../src/utils'
import type { ActionHandlerClass, EnhancedRequest } from '../src/types'

describe('Utils', () => {
  describe('normalizePath', () => {
    it('should add leading slash if missing', () => {
      expect(normalizePath('api/users')).toBe('/api/users')
    })

    it('should remove trailing slash unless path is just /', () => {
      expect(normalizePath('/api/users/')).toBe('/api/users')
      expect(normalizePath('/')).toBe('/')
    })

    it('should handle empty path', () => {
      expect(normalizePath('')).toBe('/')
    })

    it('should normalize double slashes', () => {
      expect(normalizePath('/api//users')).toBe('/api/users')
    })
  })

  describe('matchPath', () => {
    it('should match exact path', () => {
      expect(matchPath('/users', '/users', {})).toBe(true)
    })

    it('should not match different paths', () => {
      expect(matchPath('/users', '/posts', {})).toBe(false)
    })

    it('should match path with parameters', () => {
      expect(matchPath('/users/{id}', '/users/123', {})).toBe(true)
    })

    it('should match path with multiple parameters', () => {
      expect(matchPath('/users/{userId}/posts/{postId}', '/users/123/posts/456', {})).toBe(true)
    })

    it('should not match path with missing parameters', () => {
      expect(matchPath('/users/{id}/posts', '/users/posts', {})).toBe(false)
    })

    it('should match path with optional parameters present', () => {
      expect(matchPath('/users/{id?}', '/users/123', {})).toBe(true)
    })

    it('should match path with optional parameters missing', () => {
      expect(matchPath('/users/{id?}', '/users', {})).toBe(true)
    })

    it('should match wildcard paths', () => {
      expect(matchPath('/assets/*', '/assets/images/logo.png', {})).toBe(true)
    })
  })

  describe('isRouteHandler', () => {
    it('should identify function route handlers', () => {
      const handler = (req: EnhancedRequest) => new Response()
      expect(isRouteHandler(handler)).toBe(true)
    })

    it('should reject non-function values', () => {
      expect(isRouteHandler('not a function')).toBe(false)
      expect(isRouteHandler(123)).toBe(false)
      expect(isRouteHandler({})).toBe(false)
    })
  })

  describe('isActionClass', () => {
    it('should identify action handler classes', () => {
      class TestAction implements ActionHandlerClass {
        async handle(request: EnhancedRequest): Promise<Response> {
          return new Response()
        }
      }

      expect(isActionClass(new TestAction())).toBe(true)
    })

    it('should reject objects without handle method', () => {
      expect(isActionClass({})).toBe(false)
    })

    it('should reject non-objects', () => {
      expect(isActionClass('string')).toBe(false)
      expect(isActionClass(123)).toBe(false)
    })
  })

  describe('processHtmlTemplate', () => {
    it('should replace variables in templates', () => {
      const template = '<h1>{{title}}</h1><p>{{content}}</p>'
      const data = { title: 'Hello', content: 'World' }

      const result = processHtmlTemplate(template, data)
      expect(result).toBe('<h1>Hello</h1><p>World</p>')
    })

    it('should handle nested object properties', () => {
      const template = '<h1>{{user.name}}</h1><p>{{user.email}}</p>'
      const data = { user: { name: 'John', email: 'john@example.com' } }

      const result = processHtmlTemplate(template, data)
      expect(result).toBe('<h1>John</h1><p>john@example.com</p>')
    })

    it('should ignore variables not found in data', () => {
      const template = '<h1>{{title}}</h1><p>{{missing}}</p>'
      const data = { title: 'Hello' }

      const result = processHtmlTemplate(template, data)
      expect(result).toBe('<h1>Hello</h1><p>{{missing}}</p>')
    })

    it('should handle conditional blocks', () => {
      const template = '{{#if showHeader}}<header>Header</header>{{/if}}<main>Content</main>'

      const resultWithHeader = processHtmlTemplate(template, { showHeader: true })
      expect(resultWithHeader).toBe('<header>Header</header><main>Content</main>')

      const resultWithoutHeader = processHtmlTemplate(template, { showHeader: false })
      expect(resultWithoutHeader).toBe('<main>Content</main>')
    })

    it('should handle loop blocks', () => {
      const template = '<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>'
      const data = { items: ['one', 'two', 'three'] }

      const result = processHtmlTemplate(template, data)
      expect(result).toBe('<ul><li>one</li><li>two</li><li>three</li></ul>')
    })
  })
})