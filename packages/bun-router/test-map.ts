import process from 'node:process'
/**
 * Test script for middleware mapping
 */
import { generateMiddlewareMap } from './src/cli/middleware'

async function main() {
  try {
    // eslint-disable-next-line no-console
    console.log('Starting middleware map test...')
    await generateMiddlewareMap(
      'examples/middleware',
      'test-middleware-map.ts',
    )
    // eslint-disable-next-line no-console
    console.log('Middleware map test completed successfully!')
  }
  catch (error) {
    console.error('Failed to generate middleware map:', error)
    process.exit(1)
  }
}

main()
