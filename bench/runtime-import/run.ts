import { mkdirSync, writeFileSync } from 'node:fs'
import { arch, platform, release } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

type Variant = 'root' | 'runtime'

interface Sample {
  pair: number
  order: number
  variant: Variant
  importMs: number
  rssBytes: number
}

function option(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length)
}

function median(values: number[]): number {
  const sorted = values.toSorted((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2
}

function git(...args: string[]): string | null {
  const result = Bun.spawnSync(['git', ...args], { cwd: repositoryRoot })
  return result.exitCode === 0 ? result.stdout.toString().trim() : null
}

function gitState(): { commit: string | null, dirty: boolean | null, status: string | null } {
  const status = git('status', '--porcelain=v1')
  return {
    commit: git('rev-parse', 'HEAD'),
    dirty: status == null ? null : status.length > 0,
    status,
  }
}

const here = dirname(import.meta.path)
const repositoryRoot = resolve(here, '../..')
const packageRoot = join(repositoryRoot, 'packages/bun-router')
const entries = {
  root: join(packageRoot, 'dist/index.js'),
  runtime: join(packageRoot, 'dist/runtime.js'),
} as const
const pairs = Number(option('pairs') ?? 15)
if (!Number.isSafeInteger(pairs) || pairs < 15)
  throw new Error(`--pairs must be an integer of at least 15, received ${pairs}`)

for (const entry of Object.values(entries)) {
  if (!await Bun.file(entry).exists())
    throw new Error(`Missing ${entry}. Run \`bun run build\` before this diagnostic.`)
}

const output = resolve(repositoryRoot, option('output') ?? 'bench/runtime-import/results/latest.json')
const samples: Sample[] = []
const gitBefore = gitState()
for (let pair = 0; pair < pairs; pair++) {
  const order: Variant[] = pair % 2 === 0 ? ['root', 'runtime'] : ['runtime', 'root']
  for (const [orderIndex, variant] of order.entries()) {
    const child = Bun.spawnSync([
      process.execPath,
      join(here, 'sample.ts'),
      entries[variant],
    ], { env: { ...process.env, NODE_ENV: 'production' } })
    if (child.exitCode !== 0)
      throw new Error(child.stderr.toString())
    samples.push({
      pair,
      order: orderIndex,
      variant,
      ...JSON.parse(child.stdout.toString()),
    })
  }
}

const values = (variant: Variant, key: 'importMs' | 'rssBytes') =>
  samples.filter(sample => sample.variant === variant).map(sample => sample[key])
const pairRatios = (key: 'importMs' | 'rssBytes') => Array.from({ length: pairs }, (_, pair) => {
  const rows = samples.filter(sample => sample.pair === pair)
  return rows.find(sample => sample.variant === 'runtime')![key]
    / rows.find(sample => sample.variant === 'root')![key]
})
const metric = (key: 'importMs' | 'rssBytes') => {
  const rootMedian = median(values('root', key))
  const runtimeMedian = median(values('runtime', key))
  const ratios = pairRatios(key)
  return {
    rootMedian,
    runtimeMedian,
    medianDelta: runtimeMedian - rootMedian,
    medianPercentChange: ((runtimeMedian / rootMedian) - 1) * 100,
    pairedMedianRatio: median(ratios),
    runtimeLowerPairs: ratios.filter(ratio => ratio < 1).length,
  }
}

const gitAfter = gitState()
const result = {
  diagnosticOnly: true,
  diagnosticReason: 'Fresh-process import comparison. Hosted runners and developer machines are not dedicated benchmark hardware.',
  generatedAt: new Date().toISOString(),
  runtime: {
    name: 'Bun',
    version: Bun.version,
    executable: process.execPath,
  },
  host: {
    platform: platform(),
    release: release(),
    arch: arch(),
  },
  git: {
    before: gitBefore,
    after: gitAfter,
    changedDuringRun: gitBefore.commit !== gitAfter.commit || gitBefore.status !== gitAfter.status,
  },
  pairs,
  entries,
  importMs: metric('importMs'),
  rssBytes: metric('rssBytes'),
  samples,
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result, null, 2))
