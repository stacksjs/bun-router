import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('a rebuild removes obsolete generated chunks and declarations', async () => {
  const packageRoot = join(import.meta.dir, '..')
  const staleChunk = join(packageRoot, 'dist', '__obsolete_build_chunk__.js')
  const staleTypes = join(packageRoot, 'dist', '__obsolete_build_types__.d.ts')
  await Bun.write(staleChunk, 'export const obsolete = true\n')
  await Bun.write(staleTypes, 'export declare const obsolete: true\n')
  const child = Bun.spawn([process.execPath, 'build.ts'], {
    cwd: packageRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const timeout = setTimeout(() => child.kill(), 20_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(exit, `${stdout}\n${stderr}`).toBe(0)
    expect(await Bun.file(staleChunk).exists()).toBe(false)
    expect(await Bun.file(staleTypes).exists()).toBe(false)
    expect(await Bun.file(join(packageRoot, 'dist/index.js')).exists()).toBe(true)
    expect(await Bun.file(join(packageRoot, 'dist/index.d.ts')).exists()).toBe(true)
    expect(await Bun.file(join(packageRoot, 'dist/cli.js')).text()).toStartWith('#!/usr/bin/env bun\n')
  }
  finally {
    clearTimeout(timeout)
    child.kill()
    await child.exited
    await Promise.all([rm(staleChunk, { force: true }), rm(staleTypes, { force: true })])
  }
}, 25_000)

test('an unsupported working directory keeps its own distribution files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bun-router-build-cwd-'))
  const sentinel = join(directory, 'dist', 'unrelated.js')
  await Bun.write(sentinel, 'unrelated output')
  const child = Bun.spawn([process.execPath, join(import.meta.dir, '..', 'build.ts')], {
    cwd: directory,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const timeout = setTimeout(() => child.kill(), 20_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(exit, `${stdout}\n${stderr}`).not.toBe(0)
    expect(await Bun.file(sentinel).text()).toBe('unrelated output')
  }
  finally {
    clearTimeout(timeout)
    child.kill()
    await child.exited
    await rm(directory, { recursive: true, force: true })
  }
}, 25_000)
