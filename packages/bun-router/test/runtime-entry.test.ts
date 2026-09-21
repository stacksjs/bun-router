import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, normalize, resolve } from 'node:path'
import process from 'node:process'

describe('router runtime entry', () => {
  test('ships the serving surface without root-only modules', async () => {
    const manifest = await Bun.file(join(import.meta.dir, '../package.json')).json()
    expect(manifest.exports['./runtime']).toEqual({
      types: './dist/runtime.d.ts',
      bun: './dist/runtime.js',
      import: './dist/runtime.js',
    })
    expect(manifest.publishConfig.exports['./runtime']).toEqual(manifest.exports['./runtime'])

    const outdir = await mkdtemp(join(tmpdir(), 'router-runtime-entry-'))
    try {
      const result = await Bun.build({
        entrypoints: ['index.ts', 'runtime.ts', 'cli.ts', 'container/index.ts']
          .map(entry => join(import.meta.dir, '../src', entry)),
        outdir,
        splitting: true,
        target: 'bun',
        format: 'esm',
        minify: true,
        metafile: true,
        external: ['@stacksjs/stx', '@stacksjs/clapp', 'ts-rate-limiter'],
      })

      expect(result.success, result.logs.map(log => log.message).join('\n')).toBe(true)
      const outputs = result.metafile?.outputs ?? {}
      const pending = ['./runtime.js']
      const reachable = new Set<string>()
      const inputs = new Set<string>()
      while (pending.length) {
        const path = pending.pop()!
        if (reachable.has(path))
          continue
        reachable.add(path)
        const output = outputs[path]
        expect(output, `missing build metadata for ${path}`).toBeDefined()
        for (const input of Object.keys(output!.inputs))
          inputs.add(input)
        for (const dependency of output!.imports) {
          if (dependency.kind !== 'import-statement' || !dependency.path.startsWith('.'))
            continue
          const target = normalize(join(dirname(path), dependency.path))
          pending.push(target.startsWith('.') ? target : `./${target}`)
        }
      }

      expect(reachable.has('./index.js'), [...reachable].join('\n')).toBe(false)
      for (const rootOnly of ['/auth.ts', '/container/', '/session/', '/testing/'])
        expect([...inputs].some(input => input.includes(rootOnly)), `${rootOnly}\n${[...reachable].join('\n')}`).toBe(false)
      for (const rootHelper of [
        '/middleware/pipeline.ts',
        '/response/macros.ts',
        '/router/fluent-routing.ts',
        '/router/validation-integration.ts',
        '/routing/route-caching.ts',
        '/routing/subdomain-routing.ts',
        '/validation/validator.ts',
      ])
        expect([...inputs].some(input => input.includes(rootHelper)), `${rootHelper}\n${[...reachable].join('\n')}`).toBe(false)

      const runtimeEntry = resolve(outdir, 'runtime.js')
      expect(result.outputs.some(output => resolve(output.path) === runtimeEntry)).toBe(true)
      const fingerprints: string[] = []
      for (const [entry, mode] of [[resolve(outdir, 'index.js'), 'root'], [runtimeEntry, 'narrow']]) {
        const smoke = Bun.spawnSync([
          process.execPath,
          join(import.meta.dir, 'fixtures/runtime-entry-smoke.ts'),
          entry,
          mode,
        ], { env: { ...process.env, NODE_ENV: 'production' } })
        expect(smoke.exitCode, smoke.stderr.toString()).toBe(0)
        fingerprints.push(smoke.stdout.toString().trim())
      }
      expect(fingerprints[1]).toBe(fingerprints[0])
      const fingerprint = JSON.parse(fingerprints[0]!)
      expect(fingerprint).toMatchObject({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: '{"runtime":true}',
      })
      expect(fingerprint.methods).toEqual(expect.arrayContaining([
        'domain',
        'get',
        'matchRoute',
        'middleware',
        'model',
        'resource',
        'serve',
        'streamFile',
        'view',
        'websocket',
        'where',
        'withoutNativeDispatch',
      ]))
    }
    finally {
      await rm(outdir, { recursive: true, force: true })
    }
  })
})
