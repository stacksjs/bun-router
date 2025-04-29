import type { RouterOptions } from './src/types'
import process from 'node:process'

const config: RouterOptions = {
  // General settings
  verbose: true,

  // Route paths
  routesPath: 'src/routes',
  apiRoutesPath: 'src/routes/api.ts',
  webRoutesPath: 'src/routes/web.ts',

  // URL prefixes
  apiPrefix: '/api/v1',
  webPrefix: '',

  // View engine configuration
  views: {
    viewsPath: 'resources/views',
    extensions: ['.html', '.stx'],
    defaultLayout: 'layouts/main',
    cache: process.env.NODE_ENV === 'production',
    engine: 'auto', // auto-detect based on file extension
    minify: {
      enabled: process.env.NODE_ENV === 'production',
      options: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        minifyJS: true,
        minifyCSS: true,
      },
    },
    helpers: {
      // Add template helpers here
      formatDate: (date: Date) => date.toLocaleDateString(),
      uppercase: (str: string) => str.toUpperCase(),
      json: (obj: any) => JSON.stringify(obj, null, 2),
    },
  },

  // Default middleware configuration
  defaultMiddleware: {
    api: [
      'Middleware/Cors',
      'Middleware/JsonBody',
      'Middleware/RateLimit',
      'Middleware/Auth',
    ],
    web: [
      'Middleware/Session',
      'Middleware/Csrf',
    ],
  },

  // Documentation settings
  docs: {
    output: 'docs/api-reference.md',
    groupBy: 'tag',
    includeExamples: true,
    title: 'My API Documentation',
    description: 'Complete API reference for My Application',
    version: '2.0.0',
    baseUrl: 'https://api.example.com',
    contact: {
      name: 'API Team',
      email: 'api@example.com',
      url: 'https://example.com/support',
    },
    security: {
      bearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      apiKey: {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
      },
    },
  },

  // Server settings
  server: {
    port: Number(process.env.PORT) || 3000,
    hostname: process.env.HOST || 'localhost',
    development: process.env.NODE_ENV !== 'production',

    // CORS configuration
    cors: {
      enabled: true,
      origin: process.env.NODE_ENV === 'production'
        ? ['https://example.com', 'https://admin.example.com']
        : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Request-Id',
      ],
      exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
      credentials: true,
      maxAge: 86400,
      preflightContinue: false,
      optionsSuccessStatus: 204,
      privateNetworkAccess: true,
    },

    // Rate limiting configuration
    rateLimit: {
      // Enable/disable rate limiting globally
      enabled: true,

      // Basic settings
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Max requests per timeWindow
      timeWindow: 60000, // Time window in milliseconds (1 minute)

      // Custom message for rate limit exceeded response
      message: 'Rate limit exceeded. Please try again later.',

      // Advanced rate limiting options
      advanced: {
        // Token bucket algorithm settings (alternative to fixed window)
        tokensPerInterval: 100,
        interval: 60000,
        burst: 50,

        // Skip rate limiting for failed requests (status >= 400)
        skipFailedRequests: true,

        // Rate limiting algorithm
        // Supported values: 'fixed-window' (default), 'sliding-window', 'token-bucket'
        algorithm: 'sliding-window',
      },

      // Storage options for rate limiting data
      stores: {
        // Storage type: 'memory' (default) or 'redis'
        type: process.env.NODE_ENV === 'production' ? 'redis' : 'memory',

        // Redis configuration (when type is 'redis')
        redis: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          prefix: 'ratelimit:',
        },
      },
    },

    // Performance optimization
    performance: {
      cache: {
        enabled: true,
        type: 'redis',
        ttl: 3600,
        redis: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          prefix: 'router:cache:',
          maxRetries: 3,
          connectTimeout: 5000,
          cluster: {
            nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
            options: {
              scaleReads: 'slave',
              maxRedirections: 3,
            },
          },
        },
        routeCache: {
          enabled: true,
          ttl: 60,
          methods: ['GET', 'HEAD'],
          excludePaths: ['/api/v1/users/**'],
          varyByHeaders: ['accept-language', 'accept'],
          varyByQuery: ['page', 'limit'],
          maxSize: 1000,
          purgeConditions: {
            maxAge: 86400,
            maxItems: 10000,
            lowMemory: true,
          },
        },
        strategies: {
          'api-cache': {
            type: 'stale-while-revalidate',
            ttl: 300,
            staleWhileRevalidateTtl: 60,
          },
          'static-cache': {
            type: 'cache-first',
            ttl: 86400,
          },
        },
      },
      prefetch: {
        enabled: true,
        paths: ['/api/v1/config', '/api/v1/i18n'],
        maxConcurrent: 5,
        preloadPatterns: ['/**/*.js', '/**/*.css'],
        warmupStrategy: 'gradual',
        prefetchHeaders: {
          'X-Prefetch': '1',
        },
      },
      optimization: {
        minify: process.env.NODE_ENV === 'production',
        compress: true,
        treeshake: true,
        lazyLoad: true,
        chunkSize: 50000,
        imageOptimization: {
          enabled: true,
          quality: 85,
          formats: ['webp', 'avif'],
          maxWidth: 1920,
          responsive: true,
        },
        fontOptimization: {
          enabled: true,
          inlineSize: 8192,
          preload: true,
          formats: ['woff2'],
        },
        cssOptimization: {
          minify: true,
          purge: true,
          splitChunks: true,
          criticalPath: true,
        },
      },
      monitoring: {
        enabled: true,
        metrics: {
          responseTime: true,
          memoryUsage: true,
          cpuUsage: true,
          errorRate: true,
          requestRate: true,
          cacheStats: true,
          customMetrics: {
            activeConnections: {
              type: 'gauge',
              description: 'Number of active connections',
              labels: ['type'],
            },
          },
        },
        tracing: {
          enabled: process.env.NODE_ENV === 'production',
          sampleRate: 0.1,
          exporters: ['console', 'jaeger', 'otlp'],
          attributes: {
            'service.name': 'bun-router',
            'deployment.environment': process.env.NODE_ENV || 'development',
          },
          propagation: ['b3', 'w3c'],
          spans: {
            db: true,
            http: true,
            cache: true,
            queue: true,
          },
        },
        profiling: {
          enabled: process.env.NODE_ENV === 'production',
          sampleRate: 0.01,
          includeHeapSnapshot: true,
          gcStats: true,
        },
        logging: {
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
          destination: 'console',
          rotation: {
            size: '100m',
            interval: '1d',
            maxFiles: 7,
          },
        },
      },
    },

    // Load balancing
    loadBalancer: {
      enabled: process.env.NODE_ENV === 'production',
      strategy: 'weighted-round-robin',
      healthCheck: {
        enabled: true,
        interval: 10000,
        timeout: 5000,
        unhealthyThreshold: 3,
        healthyThreshold: 2,
        path: '/health',
        expectedStatus: 200,
        expectedBody: '{"status":"healthy"}',
        headers: {
          'X-Health-Check': '1',
        },
      },
      sticky: {
        enabled: true,
        cookieName: 'srv_id',
        ttl: 86400,
        secret: process.env.STICKY_SECRET || 'your-sticky-secret',
        path: '/',
        domain: '.example.com',
      },
      retries: {
        attempts: 3,
        timeout: 5000,
        codes: [502, 503, 504],
        backoff: {
          type: 'exponential',
          initialDelay: 100,
          maxDelay: 10000,
          factor: 2,
        },
      },
      nodes: {
        'server-1': {
          url: 'http://server1.example.com',
          weight: 100,
          backup: false,
          maxFails: 3,
          failTimeout: 30,
        },
        'server-2': {
          url: 'http://server2.example.com',
          weight: 100,
          backup: false,
          maxFails: 3,
          failTimeout: 30,
        },
      },
    },

    // Security configuration
    security: {
      schemes: {
        jwt: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      // Security-specific rate limit configuration (for auth routes, etc.)
      rateLimit: {
        enabled: true,
        max: process.env.NODE_ENV === 'production' ? 50 : 200, // Stricter limits for sensitive routes
        timeWindow: 300000, // 5 minutes
        message: 'Too many authentication attempts. Please try again later.',
        advanced: {
          skipFailedRequests: false, // Count failed auth attempts
          algorithm: 'fixed-window',
        },
      },
      cors: {
        enabled: true,
        origin: process.env.NODE_ENV === 'production'
          ? ['https://example.com', 'https://admin.example.com']
          : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-API-Key',
          'X-Request-Id',
        ],
        exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
        credentials: true,
        maxAge: 86400,
      },
      csrf: {
        enabled: true,
        secret: process.env.CSRF_SECRET || 'your-super-secret-csrf-key',
        cookie: {
          name: 'csrf-token',
          options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
          },
        },
        ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
        ignorePaths: ['/api/v1/webhook'],
        tokenLength: 32,
      },
      helmet: {
        enabled: true,
        contentSecurityPolicy: {
          directives: {
            'default-src': ['\'self\''],
            'script-src': ['\'self\'', '\'unsafe-inline\''],
            'style-src': ['\'self\'', '\'unsafe-inline\''],
            'img-src': ['\'self\'', 'data:', 'https:'],
          },
          reportOnly: false,
        },
        xssFilter: true,
        noSniff: true,
        frameOptions: 'DENY',
        hidePoweredBy: true,
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
        referrerPolicy: 'strict-origin-when-cross-origin',
        expectCt: {
          enforce: true,
          maxAge: 86400,
          reportUri: 'https://example.com/report-ct',
        },
      },
      auth: {
        jwt: {
          secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
          expiresIn: '1d',
          algorithm: 'HS256',
          issuer: 'bun-router',
          audience: 'bun-router-client',
          refreshToken: {
            enabled: true,
            expiresIn: '7d',
            renewBeforeExpiry: 86400,
          },
          rotation: {
            enabled: true,
            interval: 86400,
            maxAge: 604800,
          },
        },
        session: {
          enabled: true,
          secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
          name: 'sid',
          resave: false,
          rolling: true,
          saveUninitialized: false,
          cookie: {
            maxAge: 86400000,
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'strict',
          },
          store: {
            type: 'redis',
            redis: {
              url: process.env.REDIS_URL || 'redis://localhost:6379',
              prefix: 'router:session:',
              ttl: 86400,
              scanCount: 100,
              serializer: {
                stringify: JSON.stringify,
                parse: JSON.parse,
              },
            },
          },
        },
        oauth2: {
          enabled: true,
          providers: {
            github: {
              clientId: process.env.GITHUB_CLIENT_ID || '',
              clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
              callbackURL: 'https://example.com/auth/github/callback',
              scope: ['user', 'repo'],
            },
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID || '',
              clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
              callbackURL: 'https://example.com/auth/google/callback',
              scope: ['profile', 'email'],
            },
          },
        },
      },
      encryption: {
        enabled: true,
        algorithm: 'aes-256-gcm',
        key: process.env.ENCRYPTION_KEY || 'your-encryption-key',
        encoding: 'base64',
      },
      sanitization: {
        enabled: true,
        rules: {
          body: {
            type: 'escape',
            options: {
              allowedTags: ['b', 'i', 'em', 'strong'],
            },
          },
          params: {
            type: 'validate',
            options: {
              stripNull: true,
              stripUndefined: true,
            },
          },
        },
      },
    },

    // Clustering support
    cluster: {
      enabled: process.env.NODE_ENV === 'production',
      workers: 'auto',
      sticky: true,
      strategy: 'lc',
      maxMemory: 1024 * 1024 * 1024, // 1GB
      restartOnMemory: true,
      ipcTimeout: 1000,
    },

    // Graceful shutdown
    gracefulShutdown: {
      enabled: true,
      timeout: 30000,
      signals: ['SIGTERM', 'SIGINT'],
      forceTimeout: 10000,
      drain: {
        enabled: true,
        timeout: 5000,
        waitForStreams: true,
      },
      async preShutdown() {
        console.log('Preparing for shutdown...')
      },
    },

    // Custom middleware and error handling
    middleware: {
      timeout: 30000,
      order: [
        'compression',
        'static',
        'cors',
        'security',
        'session',
        'body-parser',
        'router',
      ],
      global: [
        async (req, next) => {
          const start = Date.now()
          const res = await next()
          const duration = Date.now() - start
          console.log(`${req.method} ${req.url} - ${duration}ms`)
          return res
        },
      ],
      async errorHandler(error: Error) {
        console.error('Error:', error)
        return new Response('Internal Server Error', { status: 500 })
      },
      async notFound() {
        return new Response('Not Found', { status: 404 })
      },
    },

    // Lifecycle hooks
    hooks: {
      async onStart() {
        console.log('Server starting...')
      },
      async onStop() {
        console.log('Server stopping...')
      },
      async onRequest(req) {
        const headers = new Headers(req.headers)
        headers.set('X-Request-Id', crypto.randomUUID())
        return new Request(req.url, {
          method: req.method,
          headers,
          body: req.body,
        })
      },
      async onResponse(res) {
        const headers = new Headers(res.headers)
        headers.set('Server-Timing', 'app;dur=150')
        return new Response(res.body, {
          status: res.status,
          headers,
        })
      },
      async onError(error) {
        console.error('Unhandled error:', error)
      },
      async onMetric(metric) {
        console.log('Metric:', metric)
      },
      async onTrace(span) {
        console.log('Trace:', span)
      },
    },

    // Response compression
    compression: {
      enabled: true,
      level: process.env.NODE_ENV === 'production' ? 6 : 1,
      threshold: 1024,
    },

    // Static file serving
    static: {
      enabled: true,
      dir: 'public',
      maxAge: process.env.NODE_ENV === 'production' ? 86400 * 7 : 0,
    },

    // Experimental features
    experimental: {
      http3: false,
      webTransport: false,
      earlyHints: true,
      webSocket: {
        enabled: true,
        compression: true,
        maxPayload: 1024 * 1024, // 1MB
      },
    },
  },
}

export default config
