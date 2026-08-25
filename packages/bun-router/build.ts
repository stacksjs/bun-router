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
    minify: true,
    // Resolve these from the consumer at runtime instead of inlining them.
    //
    // renderStxFile() already routes its import through a variable "to avoid
    // build-time resolution" and tells the user to `bun add @stacksjs/stx` if
    // it is missing — but Bun constant-folds the variable and bundled the
    // whole renderer anyway. The result was that an app's own @stacksjs/stx
    // was never what ran: patching it changed nothing, because this frozen
    // copy did the rendering. A slot-include fix released in stx 0.2.227 was
    // invisible to every consumer for exactly this reason.
    //
    // The two declared dependencies are external for the ordinary reason —
    // consumers install them, so bundling only pins a stale version.
    external: ['@stacksjs/stx', '@stacksjs/clapp', 'ts-rate-limiter'],
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

// Smoke-check every emitted entrypoint. v0.0.19 shipped a dist/index.js that
// re-exported 19 bindings whose declarations the bundler had tree-shaken away,
// so importing the package threw a SyntaxError. Nothing in the build caught it.
// Adding "sideEffects": false to this package.json is what triggered it: the
// bundler applies the field to our own sources and drops module bodies while
// keeping their re-exported names. Do not re-add it without checking this passes.
for (const entry of ['./dist/index.js', './dist/cli.js', './dist/container/index.js']) {
  try {
    await import(entry)
  }
  catch (error) {
    console.error(`\nBuild produced an unloadable bundle: ${entry}`)
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
