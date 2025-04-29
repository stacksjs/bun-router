import { dts } from 'bun-plugin-dtsx'

await Bun.build({
  entrypoints: ['src/index.ts', 'src/cli.ts'],
  outdir: './dist',
  splitting: true,
  target: 'bun',
  format: 'esm',
  plugins: [dts()],
})
