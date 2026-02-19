import type { SessionData, SessionStore } from '../types/core'

/**
 * Minimal Redis client interface.
 * Compatible with ioredis, node-redis, or any client implementing these methods.
 */
export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: any[]): Promise<any>
  del(key: string | string[]): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  keys(pattern: string): Promise<string[]>
}

/**
 * Redis-backed session store.
 * Ideal for distributed/multi-server deployments.
 * Requires a Redis client to be passed in.
 */
export class RedisSessionStore implements SessionStore<SessionData> {
  private prefix: string

  constructor(
    private client: RedisClient,
    private defaultTtl: number = 86400,
    prefix: string = 'sess:',
  ) {
    this.prefix = prefix
  }

  private key(sid: string): string {
    return `${this.prefix}${sid}`
  }

  async get(sid: string): Promise<SessionData | null> {
    const data = await this.client.get(this.key(sid))
    if (!data) return null

    try {
      return JSON.parse(data) as SessionData
    }
    catch {
      return null
    }
  }

  async set(sid: string, session: SessionData, ttl?: number): Promise<void> {
    const key = this.key(sid)
    const seconds = ttl ?? this.defaultTtl
    await this.client.set(key, JSON.stringify(session), 'EX', seconds)
  }

  async destroy(sid: string): Promise<void> {
    await this.client.del(this.key(sid))
  }

  async touch(sid: string, session: SessionData, ttl?: number): Promise<void> {
    const key = this.key(sid)
    const seconds = ttl ?? this.defaultTtl
    // Reset TTL and update data
    await this.client.set(key, JSON.stringify(session), 'EX', seconds)
  }

  async all(): Promise<Record<string, SessionData>> {
    const keys = await this.client.keys(`${this.prefix}*`)
    const result: Record<string, SessionData> = {}

    for (const key of keys) {
      const data = await this.client.get(key)
      if (data) {
        try {
          const sid = key.slice(this.prefix.length)
          result[sid] = JSON.parse(data)
        }
        catch { /* skip invalid data */ }
      }
    }

    return result
  }

  async length(): Promise<number> {
    const keys = await this.client.keys(`${this.prefix}*`)
    return keys.length
  }

  async clear(): Promise<void> {
    const keys = await this.client.keys(`${this.prefix}*`)
    if (keys.length > 0) {
      await this.client.del(keys)
    }
  }
}
