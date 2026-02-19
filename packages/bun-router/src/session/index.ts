import type { SessionData, SessionStore } from '../types/core'
import { MemorySessionStore } from './memory-store'
import { FileSessionStore } from './file-store'
import { RedisSessionStore } from './redis-store'
import type { RedisClient } from './redis-store'
import { DatabaseSessionStore } from './database-store'
import type { SessionDatabaseAdapter } from './database-store'

export { MemorySessionStore } from './memory-store'
export { FileSessionStore } from './file-store'
export { RedisSessionStore } from './redis-store'
export type { RedisClient } from './redis-store'
export { DatabaseSessionStore } from './database-store'
export type { SessionDatabaseAdapter } from './database-store'

export interface SessionConfig {
  driver: 'memory' | 'file' | 'redis' | 'database'
  ttl?: number
  cookie?: {
    name?: string
    maxAge?: number
    path?: string
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  }
  // Driver-specific options
  file?: {
    dir?: string
  }
  redis?: {
    client: RedisClient
    prefix?: string
  }
  database?: {
    adapter: SessionDatabaseAdapter
  }
}

/**
 * Create a session store based on configuration
 */
export function createSessionStore(config: SessionConfig): SessionStore<SessionData> {
  const ttl = config.ttl ?? 86400

  switch (config.driver) {
    case 'memory':
      return new MemorySessionStore(ttl)

    case 'file':
      return new FileSessionStore(ttl, config.file?.dir)

    case 'redis': {
      if (!config.redis?.client) {
        throw new Error('Redis client is required for redis session driver')
      }
      return new RedisSessionStore(config.redis.client, ttl, config.redis.prefix)
    }

    case 'database': {
      if (!config.database?.adapter) {
        throw new Error('Database adapter is required for database session driver')
      }
      return new DatabaseSessionStore(config.database.adapter, ttl)
    }

    default:
      return new MemorySessionStore(ttl)
  }
}

/**
 * Session manager for request handling.
 * Wraps a SessionStore and provides flash data, regeneration, etc.
 */
export class SessionManager {
  private sessionId: string
  private data: SessionData
  private store: SessionStore<SessionData>
  private flashedKeys: string[] = []
  private previousFlash: Record<string, unknown> = {}
  private dirty = false

  constructor(sessionId: string, data: SessionData, store: SessionStore<SessionData>) {
    this.sessionId = sessionId
    this.data = data
    this.store = store

    // Capture previous flash data to clear after this request
    this.previousFlash = { ...(data.flash || {}) }
  }

  get id(): string {
    return this.sessionId
  }

  /**
   * Get a value from the session
   */
  get<T = unknown>(key: string): T | undefined {
    // Check flash data first
    if (this.data.flash && key in this.data.flash) {
      return this.data.flash[key] as T
    }
    if (this.data.data && key in this.data.data) {
      return this.data.data[key] as T
    }
    return undefined
  }

  /**
   * Set a value in the session
   */
  set(key: string, value: unknown): void {
    if (!this.data.data) this.data.data = {}
    this.data.data[key] = value
    this.dirty = true
  }

  /**
   * Check if a key exists in the session
   */
  has(key: string): boolean {
    return (this.data.data && key in this.data.data) || (this.data.flash && key in this.data.flash) || false
  }

  /**
   * Remove a value from the session
   */
  forget(key: string): void {
    if (this.data.data) {
      delete this.data.data[key]
      this.dirty = true
    }
  }

  /**
   * Get all session data
   */
  all(): Record<string, unknown> {
    return { ...(this.data.data || {}), ...(this.data.flash || {}) }
  }

  /**
   * Flash a key-value pair for the next request only
   */
  flash(key: string, value: unknown): void {
    if (!this.data.flash) this.data.flash = {}
    this.data.flash[key] = value
    this.flashedKeys.push(key)
    this.dirty = true
  }

  /**
   * Get a flash value (available for current request)
   */
  getFlash<T = unknown>(key: string): T | undefined {
    return this.previousFlash[key] as T | undefined
  }

  /**
   * Keep specific flash data for another request
   */
  keep(keys: string[]): void {
    for (const key of keys) {
      if (key in this.previousFlash) {
        this.flash(key, this.previousFlash[key])
      }
    }
  }

  /**
   * Reflash all flash data for another request
   */
  reflash(): void {
    for (const [key, value] of Object.entries(this.previousFlash)) {
      this.flash(key, value)
    }
  }

  /**
   * Regenerate session ID (keeps data)
   */
  async regenerate(): Promise<string> {
    const oldId = this.sessionId
    this.sessionId = generateSessionId()

    // Move data to new session
    await this.store.set(this.sessionId, this.data)
    await this.store.destroy(oldId)

    return this.sessionId
  }

  /**
   * Invalidate the session (new ID, clear data)
   */
  async invalidate(): Promise<string> {
    const oldId = this.sessionId
    this.sessionId = generateSessionId()
    this.data = { id: this.sessionId }

    await this.store.destroy(oldId)
    await this.store.set(this.sessionId, this.data)

    return this.sessionId
  }

  /**
   * Save session data to the store.
   * Call this at the end of the request.
   */
  async save(): Promise<void> {
    // Clear old flash data (data that was available this request but not re-flashed)
    if (this.data.flash) {
      const newFlash: Record<string, unknown> = {}
      for (const key of this.flashedKeys) {
        if (this.data.flash[key] !== undefined) {
          newFlash[key] = this.data.flash[key]
        }
      }
      this.data.flash = Object.keys(newFlash).length > 0 ? newFlash : undefined
    }

    await this.store.set(this.sessionId, this.data)
  }

  /**
   * Destroy the session completely
   */
  async destroy(): Promise<void> {
    await this.store.destroy(this.sessionId)
    this.data = {}
  }
}

/**
 * Generate a cryptographically secure session ID
 */
export function generateSessionId(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}
