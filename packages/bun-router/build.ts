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
