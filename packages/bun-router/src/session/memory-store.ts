import type { SessionData, SessionStore } from '../types/core'

interface StoredSession {
  data: SessionData
  expiresAt: number
}

/**
 * In-memory session store.
 * Fast but data is lost on server restart.
 * Suitable for development or single-process deployments.
 */
export class MemorySessionStore implements SessionStore<SessionData> {
  private sessions = new Map<string, StoredSession>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(private defaultTtl: number = 86400) {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  async get(sid: string): Promise<SessionData | null> {
    const stored = this.sessions.get(sid)
    if (!stored) return null

    if (Date.now() > stored.expiresAt) {
      this.sessions.delete(sid)
      return null
    }

    return stored.data
  }

  async set(sid: string, session: SessionData, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl ?? this.defaultTtl) * 1000
    this.sessions.set(sid, { data: session, expiresAt })
  }

  async destroy(sid: string): Promise<void> {
    this.sessions.delete(sid)
  }

  async touch(sid: string, session: SessionData, ttl?: number): Promise<void> {
    const stored = this.sessions.get(sid)
    if (stored) {
      stored.expiresAt = Date.now() + (ttl ?? this.defaultTtl) * 1000
      stored.data = session
    }
  }

  async all(): Promise<Record<string, SessionData>> {
    const result: Record<string, SessionData> = {}
    const now = Date.now()

    for (const [sid, stored] of this.sessions) {
      if (now <= stored.expiresAt) {
        result[sid] = stored.data
      }
    }

    return result
  }

  async length(): Promise<number> {
    return this.sessions.size
  }

  async clear(): Promise<void> {
    this.sessions.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [sid, stored] of this.sessions) {
      if (now > stored.expiresAt) {
        this.sessions.delete(sid)
      }
    }
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.sessions.clear()
  }
}
