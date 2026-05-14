import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Router } from '../src/router/index'

const viewsDir = join(import.meta.dir, '.tmp-views-fixture')

describe('File-based routing', () => {
  beforeAll(async () => {
    await rm(viewsDir, { recursive: true, force: true })
    await mkdir(viewsDir, { recursive: true })
    await writeFile(join(viewsDir, 'login.stx'), '<h1>login</h1>')
    await writeFile(join(viewsDir, 'dashboard.stx'), '<h1>dashboard</h1>')
  })

  afterAll(async () => {
    await rm(viewsDir, { recursive: true, force: true })
  })

  it('auto-discovers .stx routes when views() is configured', async () => {
    const router = new Router()
    router.views(viewsDir)
    await (router as any)._initFileRoutes()
    expect(router.getFileRoutes()).toHaveLength(2)
  })

  it('disableFileRouting() skips view discovery entirely', async () => {
    const router = new Router()
    router.views(viewsDir)
    router.disableFileRouting()
    await (router as any)._initFileRoutes()
    expect(router.getFileRoutes()).toHaveLength(0)
  })

  it('passing { enabled: false } to views() also skips discovery', async () => {
    const router = new Router()
    router.views({ viewsPath: viewsDir, enabled: false })
    await (router as any)._initFileRoutes()
    expect(router.getFileRoutes()).toHaveLength(0)
  })
})
