# Installation

Installing `bun-router` is simple. You can use Bun's built-in package manager or any other JavaScript package manager.

## Using Bun

The recommended way to install bun-router is with Bun:

```bash
bun add bun-router
```

## Using Other Package Managers

bun-router is also available through npm, pnpm, and yarn:

::: code-group

```bash [npm]
npm install bun-router
```

```bash [pnpm]
pnpm add bun-router
```

```bash [yarn]
yarn add bun-router
```

:::

## Requirements

bun-router is designed specifically for Bun applications and requires:

- Bun version 1.0.0 or higher
- TypeScript 5.0 or higher (if using TypeScript)

## Verifying Installation

After installation, you can create a basic server to verify everything is working correctly:

```typescript
import { Router } from 'bun-router'

// Create a new router
const router = new Router()

// Add a route
router.get('/', () => new Response('Hello from bun-router!'))

// Start the server
router.serve({
  port: 3000,
})

console.log('Server running at http://localhost:3000')
```

Run this file with Bun:

```bash
bun run server.ts
```

Visit `http://localhost:3000` in your browser and you should see "Hello from bun-router!".

## Next Steps

Now that you have bun-router installed, check out the [Quick Start](/quick-start) guide to learn the basics.
