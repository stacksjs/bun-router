import type { EnhancedRequest, NextFunction } from '../src/types'
import { beforeEach, describe, expect, it, jest } from 'bun:test'
import { config } from '../src/config'
import { Cors, JsonBody, RequestId, Session } from '../src/middleware'
import { Router } from '../src/router'

describe('Middleware', () => {
  let router: Router
  let nextMock: NextFunction
  let responseMock: Response

  beforeEach(() => {
    router = new Router()
    responseMock = new Response('Test')
    nextMock = jest.fn().mockResolvedValue(responseMock)
  })

  describe('CORS Middleware', () => {
    it('should add CORS headers to response', async () => {
      // Configure CORS settings
      if (!config.server) {
        config.server = {} as any
      }
      config.server.cors = {
        enabled: true,
        origin: 'https://example.com',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      }

      const corsMiddleware = new Cors()

      const req = new Request('https://api.example.com/test', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      }) as EnhancedRequest
      req.params = {}

      const response = await corsMiddleware.handle(req, nextMock)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should handle actual CORS requests', async () => {
      // Configure CORS settings
      if (!config.server) {
        config.server = {} as any
      }
      config.server.cors = {
        enabled: true,
        origin: 'https://example.com',
      }

      const corsMiddleware = new Cors()

      const req = new Request('https://api.example.com/test', {
        method: 'GET',
        headers: {
          Origin: 'https://example.com',
        },
      }) as EnhancedRequest
      req.params = {}

      const response = await corsMiddleware.handle(req, nextMock)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
      expect(nextMock).toHaveBeenCalled()
    })
  })

  describe('JSON Body Middleware', () => {
    it('should parse JSON request body', async () => {
      const bodyMiddleware = new JsonBody()

      const jsonData = { name: 'Test User', email: 'test@example.com' }
      const req = new Request('https://example.com/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      }) as EnhancedRequest
      req.params = {}

      await bodyMiddleware.handle(req, nextMock)

      expect(req.jsonBody).toEqual(jsonData)
      expect(nextMock).toHaveBeenCalled()
    })

    it('should handle invalid JSON', async () => {
      const bodyMiddleware = new JsonBody()

      const req = new Request('https://example.com/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{invalid-json',
      }) as EnhancedRequest
      req.params = {}

      const response = await bodyMiddleware.handle(req, nextMock)

      expect(response.status).toBe(400)
      expect(await response.text()).toContain('Invalid JSON')
      expect(nextMock).not.toHaveBeenCalled()
    })

    it('should skip non-JSON content types', async () => {
      const bodyMiddleware = new JsonBody()

      const req = new Request('https://example.com/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'Plain text content',
      }) as EnhancedRequest
      req.params = {}

      await bodyMiddleware.handle(req, nextMock)

      expect(req.jsonBody).toBeUndefined()
      expect(nextMock).toHaveBeenCalled()
    })
  })

  describe('Request ID Middleware', () => {
    it('should add request ID to the request', async () => {
      const idMiddleware = new RequestId()

      const req = new Request('https://example.com/api/test') as EnhancedRequest
      req.params = {}

      await idMiddleware.handle(req, nextMock)

      expect(req.requestId).toBeDefined()
      expect(typeof req.requestId).toBe('string')
      expect(req.requestId?.length).toBeGreaterThan(0)
      expect(nextMock).toHaveBeenCalled()
    })
  })

  describe('Session Middleware', () => {
    it('should initialize a new session', async () => {
      const sessionMiddleware = new Session()

      const req = new Request('https://example.com/') as EnhancedRequest
      req.params = {}
      req.cookies = {
        get: jest.fn().mockReturnValue(undefined),
        set: jest.fn(),
        delete: jest.fn(),
        getAll: jest.fn().mockReturnValue({}),
      }

      await sessionMiddleware.handle(req, nextMock)

      // Should create a new session
      expect(req.session).toBeDefined()
      // Should set a session cookie
      expect(req.cookies.set).toHaveBeenCalled()
      expect(nextMock).toHaveBeenCalled()
    })
  })
})
