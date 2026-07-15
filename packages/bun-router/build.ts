import { $ } from 'bun'

await Promise.all([
  Bun.build({
    // container/index is its own entrypoint so the documented
    // `@stacksjs/bun-router/container` subpath import resolves at runtime
    entrypoints: ['src/index.ts', 'src/cli.ts', 'src/container/index.ts'],
    outdir: './dist',
    splitting: true,
    target: 'bun',
    format: 'esm',
  }),
  $`bunx --bun tsc -p tsconfig.build.json`,
])

// The bin entry must start with a shebang to be directly executable
// (npm marks it executable when it begins with one). Bun's bundler does
// not emit one, so prepend it post-build.
const cliPath = './dist/cli.js'
const cli = await Bun.file(cliPath).text()
if (!cli.startsWith('#!'))
  await Bun.write(cliPath, `#!/usr/bin/env bun\n${cli}`)
