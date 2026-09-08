import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

describe('runtime import graph', () => {
  test('defers native crypto imports and supports first and repeated feature use in the built entry', async () => {
    const outdir = await mkdtemp(join(tmpdir(), 'router-import-graph-'))
    try {
      const result = await Bun.build({
        entrypoints: ['index.ts', 'cli.ts', 'container/index.ts']
          .map(entry => join(import.meta.dir, '../src', entry)),
        outdir,
        splitting: true,
        target: 'bun',
        format: 'esm',
        minify: true,
        external: ['@stacksjs/stx', '@stacksjs/clapp', 'ts-rate-limiter'],
      })

      expect(result.success).toBe(true)
      const outputs = new Map(result.outputs.map(output => [resolve(output.path), output]))
      const scanner = new Bun.Transpiler({ loader: 'js' })
      const pending = [join(outdir, 'index.js')]
      const visited = new Set<string>()
      const eagerCryptoImports: string[] = []
      while (pending.length) {
        const path = pending.pop()!
        if (visited.has(path))
          continue
        visited.add(path)
        const output = outputs.get(path)
        expect(output).toBeDefined()
        for (const dependency of scanner.scanImports(await output!.text())) {
          if (dependency.kind === 'dynamic-import')
            continue
          if (['crypto', 'node:crypto'].includes(dependency.path))
            eagerCryptoImports.push(`${path}: ${dependency.path}`)
          if (dependency.path.startsWith('.'))
            pending.push(resolve(dirname(path), dependency.path))
        }
      }
      expect(eagerCryptoImports).toEqual([])
      for (const feature of ['jwt', 'csrf', 'request-id', 'upload', 'monitor']) {
        const smoke = Bun.spawnSync([
          process.execPath,
          join(import.meta.dir, 'fixtures/crypto-smoke.ts'),
          join(outdir, 'index.js'),
          feature,
        ], { env: { ...process.env, NODE_ENV: 'test' } })
        expect(smoke.exitCode, smoke.stderr.toString()).toBe(0)
      }
    }
    finally {
      await rm(outdir, { recursive: true, force: true })
    }
  })

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
