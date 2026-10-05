import type { ClientAddressOptions } from '../request/client-address'
import type { EnhancedRequest, NextFunction } from '../types'
import { config } from '../config'
import { addressInRanges, clientAddress } from '../request/client-address'

export interface DDoSProtectionOptions {
  enabled?: boolean
  maxRequestsPerSecond?: number
  maxRequestsPerMinute?: number
  maxRequestsPerHour?: number
  burstLimit?: number
  windowSize?: number
  blockDuration?: number
  /** Addresses or CIDR ranges never limited. */
  whitelistedIPs?: string[]
  /** Addresses or CIDR ranges always refused. */
  blacklistedIPs?: string[]
  /**
   * Read the client from forwarding headers when a trusted proxy delivered
   * the request (see `clientAddress`). False keys on the socket peer alone.
   */
  trustProxy?: boolean
  /** Which proxies count as trusted - see `clientAddress()`. */
  clientAddress?: ClientAddressOptions
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: EnhancedRequest) => string
  onLimitReached?: (req: EnhancedRequest, rateLimitInfo: DDoSRateLimitInfo) => Response | Promise<Response>
  store?: 'memory' | 'redis'
  redis?: {
    url: string
    prefix?: string
  }
}

interface RequestInfo {
  count: number
  firstRequest: number
  lastRequest: number
  blocked: boolean
  blockExpires?: number
}

/**
 * Rate-limit details passed to `onLimitReached` when a client is blocked.
 */
export interface DDoSRateLimitInfo extends RequestInfo {
  /** Seconds until the block lifts (mirrors the Retry-After header) */
  retryAfter: number
}

/** `address` is listed outright, or falls inside a listed CIDR range. */
function matchesAddress(address: string, list: readonly string[] | undefined): boolean {
  return !!list && (list.includes(address) || addressInRanges(address, list))
}

export default class DDoSProtection {
  private options: DDoSProtectionOptions
  private requestStore: Map<string, RequestInfo> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(options: DDoSProtectionOptions = {}) {
    const ddosConfig = config.server?.security?.ddos || {}

    this.options = {
      enabled: options.enabled ?? ddosConfig.enabled ?? true,
      maxRequestsPerSecond: options.maxRequestsPerSecond ?? ddosConfig.maxRequestsPerSecond ?? 10,
      maxRequestsPerMinute: options.maxRequestsPerMinute ?? ddosConfig.maxRequestsPerMinute ?? 100,
      maxRequestsPerHour: options.maxRequestsPerHour ?? ddosConfig.maxRequestsPerHour ?? 1000,
      burstLimit: options.burstLimit ?? ddosConfig.burstLimit ?? 20,
      windowSize: options.windowSize ?? ddosConfig.windowSize ?? 60000, // 1 minute
      blockDuration: options.blockDuration ?? ddosConfig.blockDuration ?? 300000, // 5 minutes
      whitelistedIPs: options.whitelistedIPs ?? ddosConfig.whitelistedIPs ?? [],
      blacklistedIPs: options.blacklistedIPs ?? ddosConfig.blacklistedIPs ?? [],
      trustProxy: options.trustProxy ?? ddosConfig.trustProxy ?? true,
      clientAddress: options.clientAddress,
      skipSuccessfulRequests: options.skipSuccessfulRequests ?? ddosConfig.skipSuccessfulRequests ?? false,
      skipFailedRequests: options.skipFailedRequests ?? ddosConfig.skipFailedRequests ?? false,
      keyGenerator: options.keyGenerator ?? this.defaultKeyGenerator.bind(this),
      onLimitReached: options.onLimitReached,
      store: options.store ?? ddosConfig.store ?? 'memory',
      redis: options.redis ?? ddosConfig.redis,
    }

    // Start cleanup interval for memory store
    if (this.options.store === 'memory') {
      this.startCleanupInterval()
    }
  }

  /**
   * The client's address as trusted proxies report it. This used to take the
   * first `X-Forwarded-For` entry, which the client writes: a fresh one per
   * request never hit a limit, and naming a whitelisted address skipped them.
   */
  private defaultKeyGenerator(req: EnhancedRequest): string {
    const options = this.options.trustProxy
      ? this.options.clientAddress
      : { ...this.options.clientAddress, trustedProxies: [] }
    return clientAddress(req, options) ?? 'unknown'
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, info] of this.requestStore.entries()) {
        // Remove expired entries
        if (now - info.lastRequest > this.options.windowSize! * 2) {
          this.requestStore.delete(key)
        }
        // Remove expired blocks
        if (info.blocked && info.blockExpires && now > info.blockExpires) {
          info.blocked = false
          info.blockExpires = undefined
        }
      }
    }, this.options.windowSize! / 2) // Cleanup every half window
    // Background housekeeping must not keep the process alive
    this.cleanupInterval.unref?.()
  }

  private isWhitelisted(ip: string): boolean {
    return matchesAddress(ip, this.options.whitelistedIPs)
  }

  private isBlacklisted(ip: string): boolean {
    return matchesAddress(ip, this.options.blacklistedIPs)
  }

  private getRateLimitInfo(key: string, now: number): RequestInfo {
    let info = this.requestStore.get(key)

    if (!info) {
      // Hard cap on tracked clients: a spoofed-IP flood would otherwise
      // grow the store faster than the interval cleanup can drain it.
      // Evicting the oldest entries (Map insertion order) only resets
      // counters for long-idle clients.
      if (this.requestStore.size >= 100_000) {
        let toEvict = Math.ceil(this.requestStore.size / 10)
        for (const oldestKey of this.requestStore.keys()) {
          this.requestStore.delete(oldestKey)
          if (--toEvict <= 0) {
            break
          }
        }
      }

      info = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        blocked: false,
      }
      this.requestStore.set(key, info)
    }

    // Reset count if window has passed
    if (now - info.firstRequest > this.options.windowSize!) {
      info.count = 0
      info.firstRequest = now
    }

    return info
  }

  private shouldBlock(info: RequestInfo, now: number): boolean {
    // Check if already blocked and block hasn't expired
    if (info.blocked && info.blockExpires && now < info.blockExpires) {
      return true
    }

    // Check burst limit (requests per second)
    const _secondWindow = 1000
    const recentRequests = info.count // Simplified for this implementation
    if (recentRequests > this.options.burstLimit!) {
      return true
    }

    // Check requests per minute
    if (info.count > this.options.maxRequestsPerMinute!) {
      return true
    }

    return false
  }

  private blockIP(info: RequestInfo, now: number): void {
    info.blocked = true
    info.blockExpires = now + this.options.blockDuration!
  }

  private createBlockedResponse(req: EnhancedRequest, info: RequestInfo): Response | Promise<Response> {
    const retryAfter = Math.ceil((info.blockExpires! - Date.now()) / 1000)

    const headers = {
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': this.options.maxRequestsPerMinute!.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': Math.ceil(info.blockExpires! / 1000).toString(),
    }

    if (this.options.onLimitReached) {
      return this.options.onLimitReached(req, { ...info, retryAfter })
    }

    return new Response(JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })
  }

  async handle(req: EnhancedRequest, next: NextFunction): Promise<Response> {
    // Skip if DDoS protection is disabled
    if (!this.options.enabled) {
      const response = await next()
      return response || new Response('Not Found', { status: 404 })
    }

    const now = Date.now()
    const key = this.options.keyGenerator!(req)

    // Check if IP is whitelisted
    if (this.isWhitelisted(key)) {
      const response = await next()
      return response || new Response('Not Found', { status: 404 })
    }

    // Check if IP is blacklisted
    if (this.isBlacklisted(key)) {
      return new Response('Access Denied', { status: 403 })
    }

    // Get rate limit info
    const info = this.getRateLimitInfo(key, now)

    // Check if should block
    if (this.shouldBlock(info, now)) {
      this.blockIP(info, now)
      return this.createBlockedResponse(req, info)
    }

    // Increment request count
    info.count++
    info.lastRequest = now

    // Process request
    const response = await next()

    if (!response) {
      return new Response('Not Found', { status: 404 })
    }

    // Skip counting based on response status if configured
    if (this.options.skipSuccessfulRequests && response.status < 400) {
      info.count--
    }
    if (this.options.skipFailedRequests && response.status >= 400) {
      info.count--
    }

    // Add rate limit headers
    const headers = new Headers(response.headers)
    headers.set('X-RateLimit-Limit', this.options.maxRequestsPerMinute!.toString())
    headers.set('X-RateLimit-Remaining', Math.max(0, this.options.maxRequestsPerMinute! - info.count).toString())
    headers.set('X-RateLimit-Reset', Math.ceil((info.firstRequest + this.options.windowSize!) / 1000).toString())

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  // Cleanup method
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.requestStore.clear()
  }
}

// Factory function for easy use
export function ddosProtection(options: DDoSProtectionOptions = {}): (req: EnhancedRequest, next: NextFunction) => Promise<Response> {
  const instance = new DDoSProtection(options)
  return async (req: EnhancedRequest, next: NextFunction) => instance.handle(req, next)
}
