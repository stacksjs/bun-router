import { expect, test } from 'bun:test'
import { join } from 'node:path'
import process from 'node:process'

test.each(['jwt', 'csrf', 'request-id', 'upload', 'monitor', 'cache'])('initializes crypto on first %s use and reuses it', (feature) => {
  const result = Bun.spawnSync([
    process.execPath,
    join(import.meta.dir, 'fixtures/crypto-smoke.ts'),
    join(import.meta.dir, '../src/index.ts'),
    feature,
  ], { env: { ...process.env, NODE_ENV: 'test' } })
  expect(result.exitCode, result.stderr.toString()).toBe(0)
})
