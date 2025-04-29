import { Router } from '../src'
import { rateLimit } from '../src/middleware'
import { createRateLimiter } from 'ts-rate-limiter'
import type { EnhancedRequest } from '../src/types'

/**
 * IMPORTANT: To run this example, you need to install Redis and the Redis client:
 *
 * bun add redis
 *
 * And have a Redis server running locally or specify REDIS_URL environment variable
 */

// Create a new router
const router = new Router({ verbose: true })

async function setupRedisRateLimiting() {
  try {
    // For Bun's built-in Redis client
    let redisClient

    // Check if we're running in Bun
    if (typeof globalThis.Bun !== 'undefined') {
      try {
        // Use Bun's built-in Redis client
        const { RedisClient } = await import('bun')
        redisClient = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379')
        console.log('Using Bun\'s native Redis client for rate limiting')
      }
      catch (bunRedisError) {
        console.warn('Failed to use Bun\'s native Redis client:', bunRedisError)
      }
    }

    // Fall back to standard Redis client if Bun's client isn't available
    if (!redisClient) {
      try {
        // We need to use dynamic import for Redis since it's an optional dependency
        // @ts-expect-error - Redis is a runtime dependency
        const redis = await import('redis')
        redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
        console.log('Using npm redis client for rate limiting')
        await redisClient.connect()
      }
      catch (redisImportError) {
        console.error(`Failed to import redis client: ${redisImportError}`)
        console.warn('Falling back to memory storage for rate limiting (not recommended for production)')
        return null
      }
    }

    // Set up error handling for Redis client
    if ('onclose' in redisClient) {
      redisClient.onclose = (error: unknown) => {
        if (error) {
          console.error('Redis connection closed with error:', error)
        }
      }
    }
    else if ('on' in redisClient && typeof redisClient.on === 'function') {
      redisClient.on('error', (err: Error) => {
        console.error('Redis error:', err.message)
      })
    }

    // Create config that will use Redis
    return {
      storage: 'redis',
      redis: {
        client: redisClient,
        keyPrefix: 'bun-router:ratelimit:',
        enableSlidingWindow: true,
      }
    }
  }
  catch (error) {
    console.error('Error setting up Redis rate limiting:', error)
    return null
  }
}

async function startServer() {
  // Set up Redis storage for rate limiting
  const redisConfig = await setupRedisRateLimiting()

  // Create rate limiter with Redis storage (or fall back to memory)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    // If we have Redis config, the middleware will use it
  })

  // Separate stricter limiter for authentication routes
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 attempts per hour
    // If we have Redis config, the middleware will use it
  })

  // API routes with rate limiting
  router.group({ prefix: '/api' }, () => {
    // Public endpoints with standard rate limiting
    router.get('/products', async (_req: EnhancedRequest) => {
      return new Response(JSON.stringify({ products: [{ id: 1, name: 'Product 1' }] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    })

    router.get('/categories', async (_req: EnhancedRequest) => {
      return new Response(JSON.stringify({ categories: [{ id: 1, name: 'Category 1' }] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    })

    // Apply standard API rate limiting to this group
    router.use(apiLimiter.handle.bind(apiLimiter))
  })

  // Auth routes with stricter rate limiting
  router.group({ prefix: '/auth' }, () => {
    router.post('/login', async (_req: EnhancedRequest) => {
      return new Response(JSON.stringify({ success: true, token: 'dummy-token' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    })

    router.post('/register', async (_req: EnhancedRequest) => {
      return new Response(JSON.stringify({ success: true, message: 'User registered' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    })

    // Apply strict auth rate limiting to this group
    router.use(authLimiter.handle.bind(authLimiter))
  })

  // Start the server
  await router.serve({
    port: 3000,
  })

  console.log('Server running at http://localhost:3000')
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error)
  process.exit(1)
})