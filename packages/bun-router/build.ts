import { $ } from 'bun'

await Promise.all([
  Bun.build({
    entrypoints: ['src/index.ts', 'src/cli.ts'],
    outdir: './dist',
    splitting: true,
    target: 'bun',
    format: 'esm',
  }),
  $`bunx --bun tsc -p tsconfig.build.json`,
])
