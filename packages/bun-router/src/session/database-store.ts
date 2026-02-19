import type { SessionData, SessionStore } from '../types/core'

/**
 * Minimal database adapter interface for session storage.
 * Implement this with your ORM (Kysely, Drizzle, etc.).
 */
export interface SessionDatabaseAdapter {
  findSession(sid: string): Promise<{ payload: string, last_activity: number } | null>
  upsertSession(sid: string, payload: string, lastActivity: number): Promise<void>
  deleteSession(sid: string): Promise<void>
  getAllSessions(): Promise<Array<{ id: string, payload: string, last_activity: number }>>
  deleteExpiredSessions(maxAge: number): Promise<void>
  countSessions(): Promise<number>
  clearAllSessions(): Promise<void>
}

/**
 * Database-backed session store.
 * Persists sessions in a database table.
 *
 * Expected table schema:
 * ```sql
 * CREATE TABLE sessions (
 *   id VARCHAR(255) PRIMARY KEY,
 *   user_id INTEGER NULL,
 *   ip_address VARCHAR(45) NULL,
 *   user_agent TEXT NULL,
 *   payload TEXT NOT NULL,
 *   last_activity INTEGER NOT NULL
 * );
 * ```
 */
export class DatabaseSessionStore implements SessionStore<SessionData> {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private adapter: SessionDatabaseAdapter,
    private defaultTtl: number = 86400,
  ) {
    // Cleanup expired sessions every 30 minutes
    this.cleanupInterval = setInterval(() => {
      const maxAge = Date.now() - this.defaultTtl * 1000
      this.adapter.deleteExpiredSessions(maxAge)
    }, 30 * 60 * 1000)
  }

  async get(sid: string): Promise<SessionData | null> {
    const record = await this.adapter.findSession(sid)
    if (!record) return null

    // Check expiration
    const maxAge = Date.now() - this.defaultTtl * 1000
    if (record.last_activity < maxAge) {
      await this.adapter.deleteSession(sid)
      return null
    }

    try {
      return JSON.parse(record.payload) as SessionData
    }
    catch {
      return null
    }
  }

  async set(sid: string, session: SessionData, _ttl?: number): Promise<void> {
    await this.adapter.upsertSession(sid, JSON.stringify(session), Date.now())
  }

  async destroy(sid: string): Promise<void> {
    await this.adapter.deleteSession(sid)
  }

  async touch(sid: string, session: SessionData, _ttl?: number): Promise<void> {
    await this.adapter.upsertSession(sid, JSON.stringify(session), Date.now())
  }

  async all(): Promise<Record<string, SessionData>> {
    const records = await this.adapter.getAllSessions()
    const result: Record<string, SessionData> = {}
    const maxAge = Date.now() - this.defaultTtl * 1000

    for (const record of records) {
      if (record.last_activity >= maxAge) {
        try {
          result[record.id] = JSON.parse(record.payload)
        }
        catch { /* skip invalid data */ }
      }
    }

    return result
  }

  async length(): Promise<number> {
    return this.adapter.countSessions()
  }

  async clear(): Promise<void> {
    await this.adapter.clearAllSessions()
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}
