import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { SessionData, SessionStore } from '../types/core'

interface FileSession {
  data: SessionData
  expiresAt: number
}

/**
 * File-based session store.
 * Persists sessions to disk as JSON files.
 * Suitable for single-server deployments.
 */
export class FileSessionStore implements SessionStore<SessionData> {
  private dir: string
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private defaultTtl: number = 86400,
    dir?: string,
  ) {
    this.dir = dir || join(tmpdir(), 'bun-router-sessions')
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true })
    }

    // Cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000)
  }

  private filePath(sid: string): string {
    // Sanitize session ID to prevent path traversal
    const safeSid = sid.replace(/[^a-zA-Z0-9_-]/g, '')
    return join(this.dir, `${safeSid}.json`)
  }

  async get(sid: string): Promise<SessionData | null> {
    const path = this.filePath(sid)
    if (!existsSync(path)) return null

    try {
      const content = readFileSync(path, 'utf-8')
      const stored: FileSession = JSON.parse(content)

      if (Date.now() > stored.expiresAt) {
        unlinkSync(path)
        return null
      }

      return stored.data
    }
    catch {
      return null
    }
  }

  async set(sid: string, session: SessionData, ttl?: number): Promise<void> {
    const stored: FileSession = {
      data: session,
      expiresAt: Date.now() + (ttl ?? this.defaultTtl) * 1000,
    }

    writeFileSync(this.filePath(sid), JSON.stringify(stored), 'utf-8')
  }

  async destroy(sid: string): Promise<void> {
    const path = this.filePath(sid)
    if (existsSync(path)) {
      unlinkSync(path)
    }
  }

  async touch(sid: string, session: SessionData, ttl?: number): Promise<void> {
    const path = this.filePath(sid)
    if (!existsSync(path)) return

    const stored: FileSession = {
      data: session,
      expiresAt: Date.now() + (ttl ?? this.defaultTtl) * 1000,
    }

    writeFileSync(path, JSON.stringify(stored), 'utf-8')
  }

  async all(): Promise<Record<string, SessionData>> {
    const result: Record<string, SessionData> = {}
    const now = Date.now()

    try {
      const files = readdirSync(this.dir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const content = readFileSync(join(this.dir, file), 'utf-8')
        const stored: FileSession = JSON.parse(content)
        if (now <= stored.expiresAt) {
          const sid = file.replace('.json', '')
          result[sid] = stored.data
        }
      }
    }
    catch { /* ignore errors */ }

    return result
  }

  async length(): Promise<number> {
    try {
      return readdirSync(this.dir).filter(f => f.endsWith('.json')).length
    }
    catch {
      return 0
    }
  }

  async clear(): Promise<void> {
    try {
      const files = readdirSync(this.dir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        unlinkSync(join(this.dir, file))
      }
    }
    catch { /* ignore errors */ }
  }

  private cleanup(): void {
    const now = Date.now()
    try {
      const files = readdirSync(this.dir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const path = join(this.dir, file)
        const content = readFileSync(path, 'utf-8')
        const stored: FileSession = JSON.parse(content)
        if (now > stored.expiresAt) {
          unlinkSync(path)
        }
      }
    }
    catch { /* ignore errors */ }
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}
