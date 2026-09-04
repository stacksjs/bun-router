import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

describe('runtime import graph', () => {
  test('does not load the optional rate limiter before middleware use', async () => {
    const result = await Bun.build({
      entrypoints: [join(import.meta.dir, '../src/index.ts')],
      target: 'bun',
      metafile: true,
      external: ['@stacksjs/stx', '@stacksjs/clapp', 'ts-rate-limiter'],
    })

    expect(result.success).toBe(true)
    const rateLimitEntry = Object.entries(result.metafile?.inputs ?? {})
      .find(([source]) => source.endsWith('/middleware/rate_limit.ts'))
    const eagerLimiterImports = rateLimitEntry?.[1].imports
      .filter(dependency => dependency.kind !== 'dynamic-import'
        && dependency.path === 'ts-rate-limiter') ?? []

    expect(eagerLimiterImports).toEqual([])
  })

  test('does not load bunfig before getConfig is called', async () => {
    const result = await Bun.build({
      entrypoints: [join(import.meta.dir, '../src/index.ts')],
      target: 'bun',
      metafile: true,
      external: ['@stacksjs/stx', '@stacksjs/clapp', 'ts-rate-limiter'],
    })

    expect(result.success).toBe(true)
    const configEntry = Object.entries(result.metafile?.inputs ?? {})
      .find(([source]) => source.endsWith('/config.ts'))
    const eagerConfigLoaderImports = configEntry?.[1].imports
      .filter(dependency => dependency.kind !== 'dynamic-import'
        && dependency.path.includes('bunfig')) ?? []

    expect(eagerConfigLoaderImports).toEqual([])
  })
})
