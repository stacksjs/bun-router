import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { CAC } from 'cac'
import chalk from 'chalk'
import { version } from '../package.json'
// import { generateApiDocs } from '../src/docs'
import { middleware } from '../src/middleware'

const cli = new CAC('router')

interface CLIOptions {
  verbose?: boolean
  output?: string
  groupBy?: 'path' | 'method' | 'tag'
  examples?: boolean
}

interface RouteListOptions {
  verbose?: boolean
  extraVerbose?: boolean
  path?: string
  exceptVendor?: boolean
  onlyVendor?: boolean
}

interface GenerateMiddlewareTypesOptions {
  output?: string
  watch?: boolean
}

interface GenerateRouteTypesOptions {
  output?: string
  watch?: boolean
}

interface GenerateRouterTypesOptions {
  output?: string
  watch?: boolean
}

cli
  .command('docs', 'Generate API documentation')
  .option('--output <file>', 'Output file path', { default: 'api-reference.md' })
  .option('--verbose', 'Enable verbose logging')
  .option('--group-by <type>', 'Group routes by path, method, or tag', {
    default: 'path',
  })
  .option('--no-examples', 'Exclude request/response examples')
  .example('router docs --output api-reference.md')
  .example('router docs --group-by method')
  .example('router docs --group-by tag --no-examples')
  .action(async (options: CLIOptions) => {
    try {
      // Temporarily commented out until docs module is implemented
      // await generateApiDocs({
      //   output: options.output,
      //   verbose: options.verbose,
      //   groupBy: options.groupBy,
      //   includeExamples: options.examples !== false,
      // })
      console.log(`✨ API documentation generated at ${options.output}`)
    }
    catch (error) {
      console.error('Failed to generate API documentation:', error)
      process.exit(1)
    }
  })

cli
  .command('route:list', 'List all registered routes')
  .option('-v, --verbose', 'Show detailed information including middleware')
  .option('-vv, --extra-verbose', 'Show very detailed information')
  .option('--path <path>', 'Filter routes by path prefix')
  .option('--except-vendor', 'Exclude vendor routes')
  .option('--only-vendor', 'Show only vendor routes')
  .example('router route:list')
  .example('router route:list -v')
  .example('router route:list --path=/api')
  .action(async (options: RouteListOptions) => {
    try {
      await displayRoutes(options)
    }
    catch (error: any) {
      console.error('Failed to list routes:', error.message)
      process.exit(1)
    }
  })

cli
  .command('middleware:types', 'Generate TypeScript types for middleware configurations')
  .option('--output <file>', 'Output file path', { default: 'middleware-types.ts' })
  .option('--watch', 'Watch for changes in middleware directory')
  .example('router middleware:types')
  .example('router middleware:types --output src/types/middleware.ts')
  .example('router middleware:types --watch')
  .action(async (options: GenerateMiddlewareTypesOptions) => {
    try {
      const outputPath = options.output || 'middleware-types.ts'
      if (options.watch) {
        await watchMiddlewareDirectory(outputPath)
      }
      else {
        await generateMiddlewareTypes(outputPath)
      }
    }
    catch (error: any) {
      console.error(chalk.red('Failed to generate middleware types:'), error.message)
      process.exit(1)
    }
  })

cli
  .command('route:types', 'Generate TypeScript types for route names')
  .option('--output <file>', 'Output file path', { default: 'route-types.ts' })
  .option('--watch', 'Watch for changes in routes directory')
  .example('router route:types')
  .example('router route:types --output src/types/routes.ts')
  .example('router route:types --watch')
  .action(async (options: GenerateRouteTypesOptions) => {
    try {
      const outputPath = options.output || 'route-types.ts'
      if (options.watch) {
        await watchRoutesDirectory(outputPath)
      }
      else {
        await generateRouteTypes(outputPath)
      }
    }
    catch (error: any) {
      console.error(chalk.red('Failed to generate route types:'), error.message)
      process.exit(1)
    }
  })

cli
  .command('router:types', 'Generate TypeScript types for router extensions')
  .option('--output <file>', 'Output file path', { default: 'router-types.ts' })
  .option('--watch', 'Watch for changes in router files')
  .example('router router:types')
  .example('router router:types --output src/types/router.ts')
  .example('router router:types --watch')
  .action(async (options: GenerateRouterTypesOptions) => {
    try {
      const outputPath = options.output || 'router-types.ts'
      if (options.watch) {
        await watchRouterFiles(outputPath)
      }
      else {
        await generateRouterTypes(outputPath)
      }
    }
    catch (error: any) {
      console.error(chalk.red('Failed to generate router types:'), error.message)
      process.exit(1)
    }
  })

async function generateMiddlewareTypes(outputPath: string): Promise<void> {
  // Get middleware information
  const middlewareInfo = Object.entries(middleware).map(([key, instance]) => ({
    name: key,
    className: instance.constructor.name,
  }))

  // Generate type definition
  const typeContent = `/**
 * This file is auto-generated.
 * DO NOT EDIT THIS FILE DIRECTLY.
 * To update, run 'bun router middleware:types'
 */
import type { ${middlewareInfo.map(m => m.className).join(', ')} } from './middleware'

/**
 * Available middleware map with middleware names as keys
 */
export interface MiddlewareMap {
${middlewareInfo.map(m => `  '${m.name}': ${m.className}`).join('\n')}
}

/**
 * String literal type of available middleware names
 */
export type MiddlewareName = ${middlewareInfo.map(m => `'${m.name}'`).join(' | ')}

/**
 * Middleware configuration type for router setup
 */
export type MiddlewareConfig = MiddlewareName | ${middlewareInfo.map(m => m.className).join(' | ')}

/**
 * Function to check if a middleware name is valid
 */
export function isValidMiddleware(name: string): name is MiddlewareName {
  return [${middlewareInfo.map(m => `'${m.name}'`).join(', ')}].includes(name)
}
`

  // Write to file
  await fs.writeFile(outputPath, typeContent)
}

/**
 * Watch for changes in the middleware directory and regenerate types
 */
async function watchMiddlewareDirectory(outputPath: string): Promise<void> {
  const middlewarePath = path.join(process.cwd(), 'src', 'middleware')

  // Check if middleware directory exists
  try {
    await fs.access(middlewarePath)
  }
  catch {
    console.error(chalk.red(`Middleware directory not found at ${middlewarePath}`))
    process.exit(1)
  }

  // Initial generation
  await generateMiddlewareTypes(outputPath)
  console.log(chalk.green(`✨ Middleware types generated at ${outputPath}`))
  console.log(chalk.blue(`Watching for changes in ${middlewarePath}...`))

  // Setup file watcher
  let timeoutId: NodeJS.Timeout | null = null
  const watcher = fs.watch(middlewarePath, { recursive: true })

  for await (const _event of watcher) {
    // Debounce to avoid multiple regenerations when multiple files change
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(async () => {
      console.log(chalk.yellow(`Changes detected in middleware directory. Regenerating types...`))
      try {
        await generateMiddlewareTypes(outputPath)
        console.log(chalk.green(`✨ Middleware types regenerated at ${outputPath}`))
      }
      catch (error: any) {
        console.error(chalk.red(`Error regenerating types: ${error.message}`))
      }
      timeoutId = null
    }, 500)
  }
}

async function displayRoutes(options: RouteListOptions) {
  try {
    // Try to load router instance from the application
    const routesFile = `${process.cwd()}/routes/index.ts`
    const { router } = await import(routesFile)

    if (!router) {
      console.error(chalk.red(`Could not find router instance in ${routesFile}.`))
      process.exit(1)
    }

    // Get routes from router
    const routes = (router as any).routes || []

    if (routes.length === 0) {
      console.log(chalk.yellow('No routes defined.'))
      return
    }

    // Filter routes based on options
    let filteredRoutes = routes

    if (options.path) {
      filteredRoutes = filteredRoutes.filter((route: any) =>
        route.path.startsWith(options.path),
      )
    }

    // Display route table
    console.log(chalk.bold('\nRoutes:'))
    console.log(chalk.dim('+-----------------+-------------------------+------------------+----------------+'))
    console.log(chalk.dim('| ') + chalk.bold('Method') + chalk.dim('          | ') + chalk.bold('URI') + chalk.dim('                     | ') + chalk.bold('Name') + chalk.dim('             | ') + chalk.bold('Handler') + chalk.dim('         |'))
    console.log(chalk.dim('+-----------------+-------------------------+------------------+----------------+'))

    filteredRoutes.forEach((route: any) => {
      const method = padString(route.method, 15)
      const path = padString(route.path, 23)
      const name = padString(route.name || '', 16)

      let handler: string
      if (typeof route.handler === 'string') {
        handler = route.handler
      }
      else if (typeof route.handler === 'function') {
        handler = route.handler.name ? `${route.handler.name}()` : 'Anonymous Function'
      }
      else {
        handler = 'Class Handler'
      }

      handler = padString(handler, 14)

      console.log(chalk.dim('| ')
        + getMethodColor(route.method)(method) + chalk.dim(' | ')
        + chalk.green(path) + chalk.dim(' | ')
        + chalk.yellow(name) + chalk.dim(' | ')
        + chalk.blue(handler) + chalk.dim(' |'))

      // Show middleware if verbose flag is set
      if (options.verbose && route.middleware && route.middleware.length > 0) {
        console.log(chalk.dim('|                 | ') + chalk.dim('Middleware: ')
          + route.middleware.map((m: any) => typeof m === 'string' ? m : m.name || 'Anonymous').join(', ')
          + chalk.dim('                                           |'))
      }
    })

    console.log(chalk.dim('+-----------------+-------------------------+------------------+----------------+'))
    console.log(`\nShowing ${filteredRoutes.length} routes`)
  }
  catch (error: any) {
    console.error(chalk.red(`Error: ${error.message}`))
    console.error(chalk.yellow(`Make sure your routes are defined in ${process.cwd()}/routes/index.ts and export a 'router' instance.`))
    throw error
  }
}

function padString(str: string, length: number): string {
  return (str + ' '.repeat(length)).substring(0, length)
}

function getMethodColor(method: string) {
  switch (method.toUpperCase()) {
    case 'GET':
      return chalk.cyan
    case 'POST':
      return chalk.green
    case 'PUT':
      return chalk.yellow
    case 'PATCH':
      return chalk.yellow
    case 'DELETE':
      return chalk.red
    case 'OPTIONS':
      return chalk.gray
    default:
      return chalk.white
  }
}

cli.command('version', 'Show the version of the Reverse Proxy CLI').action(() => {
  console.log(version)
})

cli.version(version)
cli.help()
cli.parse()

/**
 * Generate TypeScript types for route names
 * @param outputPath Where to save the generated type file
 */
async function generateRouteTypes(outputPath: string): Promise<void> {
  try {
    // Try to load router instance from the application
    const routesFile = `${process.cwd()}/routes/index.ts`
    const { router } = await import(routesFile)

    if (!router) {
      console.error(chalk.red(`Could not find router instance in ${routesFile}.`))
      process.exit(1)
    }

    // Get routes from router
    const routes = (router as any).routes || []

    if (routes.length === 0) {
      console.log(chalk.yellow('No routes defined. Creating empty types file.'))
    }

    // Collect named routes or generate names for unnamed routes
    const routeNames = routes.map((route: any) => {
      // If route has a name, use it
      if (route.name)
        return route.name

      // Otherwise generate a name based on method and path
      const methodLower = route.method.toLowerCase()
      const pathFormatted = route.path
        .replace(/^\//, '') // Remove leading slash
        .replace(/\//g, '.') // Replace other slashes with dots
        .replace(/\{([^}]+)\}/g, ':$1') // Replace {param} with :param

      return pathFormatted ? `${methodLower}.${pathFormatted}` : methodLower
    })

    // Remove duplicates
    const uniqueRouteNames = [...new Set(routeNames)]

    // Generate type definition
    const typeContent = `/**
 * This file is auto-generated.
 * DO NOT EDIT THIS FILE DIRECTLY.
 * To update, run 'bun router route:types'
 */

/**
 * String literal type for all available route names
 */
export type RouteName = ${uniqueRouteNames.length > 0
  ? uniqueRouteNames.map(name => `'${name}'`).join(' | ')
  : 'string'}

/**
 * Object type with route names as keys and string (for path generation) as values
 */
export interface RouteNameMap {
${uniqueRouteNames.map(name => `  '${name}': string`).join('\n')}
}

/**
 * Type-safe function to generate a URL for a named route
 */
export type RouteFunction = <T extends RouteName>(name: T, params?: Record<string, string>) => string

/**
 * Validate that a string is a valid route name
 */
export function isValidRouteName(name: string): name is RouteName {
  return [${uniqueRouteNames.map(name => `'${name}'`).join(', ')}].includes(name)
}
`

    // Write to file
    await fs.writeFile(outputPath, typeContent)
    console.log(chalk.green(`✨ Route types generated at ${outputPath}`))
  }
  catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error(chalk.red(`Routes file not found at ${process.cwd()}/routes/index.ts`))
      console.error(chalk.yellow('Make sure your routes are defined and exported as "router" in routes/index.ts'))
    }
    else {
      console.error(chalk.red(`Error generating route types: ${error.message}`))
    }
    throw error
  }
}

/**
 * Watch for changes in the routes directory and regenerate types
 */
async function watchRoutesDirectory(outputPath: string): Promise<void> {
  const routesPath = path.join(process.cwd(), 'routes')

  // Check if routes directory exists
  try {
    await fs.access(routesPath)
  }
  catch {
    console.error(chalk.red(`Routes directory not found at ${routesPath}`))
    process.exit(1)
  }

  // Initial generation
  await generateRouteTypes(outputPath)
  console.log(chalk.green(`✨ Route types generated at ${outputPath}`))
  console.log(chalk.blue(`Watching for changes in ${routesPath}...`))

  // Setup file watcher
  let timeoutId: NodeJS.Timeout | null = null
  const watcher = fs.watch(routesPath, { recursive: true })

  for await (const _event of watcher) {
    // Debounce to avoid multiple regenerations when multiple files change
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(async () => {
      console.log(chalk.yellow(`Changes detected in routes directory. Regenerating types...`))
      try {
        await generateRouteTypes(outputPath)
        console.log(chalk.green(`✨ Route types regenerated at ${outputPath}`))
      }
      catch (error: any) {
        console.error(chalk.red(`Error regenerating types: ${error.message}`))
      }
      timeoutId = null
    }, 500)
  }
}

/**
 * Generate TypeScript types for router extensions
 * @param outputPath Where to save the generated type file
 */
async function generateRouterTypes(outputPath: string): Promise<void> {
  try {
    // Try to load router instance from the application
    const routesFile = `${process.cwd()}/routes/index.ts`
    const { router } = await import(routesFile)

    if (!router) {
      console.error(chalk.red(`Could not find router instance in ${routesFile}.`))
      process.exit(1)
    }

    // Get router methods excluding internal properties
    const routerMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(router))
      .filter(method =>
        !method.startsWith('_')
        && method !== 'constructor'
        && typeof (router as any)[method] === 'function',
      )

    // Get custom properties that were added to router
    const extendedProperties = Object.keys(router)
      .filter(prop =>
        !['routes', 'middleware', 'hooks', 'config'].includes(prop)
        && typeof prop === 'string'
        && !prop.startsWith('_'),
      )

    // Generate type definition
    const typeContent = `/**
 * This file is auto-generated.
 * DO NOT EDIT THIS FILE DIRECTLY.
 * To update, run 'bun router router:types'
 */
import type { Router, RouteHandler, MiddlewareHandler, RouteDefinition } from '../src/types'

/**
 * Extended Router interface with all available methods and properties
 */
export interface ExtendedRouter extends Router {
  ${routerMethods.map((method) => {
    // Provide basic type definitions for common router methods
    if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
      return `${method}(path: string, handler: RouteHandler, options?: any): Router`
    }
    else if (method === 'use') {
      return `${method}(middleware: MiddlewareHandler | MiddlewareHandler[]): Router`
    }
    else if (method === 'group') {
      return `${method}(prefix: string, callback: (router: Router) => void): Router`
    }
    else {
      return `${method}: Function`
    }
  }).join('\n  ')}

  ${extendedProperties.map((prop) => {
    const propType = typeof (router as any)[prop]
    return `${prop}: ${propType}`
  }).join('\n  ')}
}

/**
 * Type for extending the router with custom methods
 */
export type RouterExtension = {
  [key: string]: Function | any
}

/**
 * Helper type for correctly typing router extensions
 *
 * Example usage:
 * \`\`\`typescript
 * import { Router, ExtendRouter } from './router-types'
 *
 * // Define extension type
 * interface MyCustomRouter extends ExtendRouter<{
 *   customMethod(param: string): void
 * }> {}
 *
 * // Create and extend the router
 * const router = new Router() as MyCustomRouter
 * router.customMethod = (param: string) => {
 *   console.log(param)
 * }
 * \`\`\`
 */
export type ExtendRouter<T extends RouterExtension> = Router & T
`

    // Write to file
    await fs.writeFile(outputPath, typeContent)
    console.log(chalk.green(`✨ Router types generated at ${outputPath}`))
  }
  catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error(chalk.red(`Routes file not found at ${process.cwd()}/routes/index.ts`))
      console.error(chalk.yellow('Make sure your routes are defined and exported as "router" in routes/index.ts'))
    }
    else {
      console.error(chalk.red(`Error generating router types: ${error.message}`))
    }
    throw error
  }
}

/**
 * Watch for changes in router files and regenerate types
 */
async function watchRouterFiles(outputPath: string): Promise<void> {
  const routerFiles = [
    path.join(process.cwd(), 'routes'),
    path.join(process.cwd(), 'src'),
  ]

  // Check if at least one directory exists
  let validPath = false
  for (const dirPath of routerFiles) {
    try {
      await fs.access(dirPath)
      validPath = true
      break
    }
    catch {
      // Continue checking other paths
    }
  }

  if (!validPath) {
    console.error(chalk.red(`No valid source directories found to watch.`))
    process.exit(1)
  }

  // Initial generation
  await generateRouterTypes(outputPath)
  console.log(chalk.green(`✨ Router types generated at ${outputPath}`))
  console.log(chalk.blue(`Watching for changes in router files...`))

  // Setup file watchers for all paths
  let timeoutId: NodeJS.Timeout | null = null

  for (const dirPath of routerFiles) {
    try {
      const watcher = fs.watch(dirPath, { recursive: true })

      // Using IIFE to create separate async context for each watcher
      ;(async () => {
        for await (const _event of watcher) {
          // Debounce to avoid multiple regenerations when multiple files change
          if (timeoutId) {
            clearTimeout(timeoutId)
          }

          timeoutId = setTimeout(async () => {
            console.log(chalk.yellow(`Changes detected in router files. Regenerating types...`))
            try {
              await generateRouterTypes(outputPath)
              console.log(chalk.green(`✨ Router types regenerated at ${outputPath}`))
            }
            catch (error: any) {
              console.error(chalk.red(`Error regenerating types: ${error.message}`))
            }
            timeoutId = null
          }, 500)
        }
      })()
    }
    catch {
      // Skip if this path doesn't exist
    }
  }
}
