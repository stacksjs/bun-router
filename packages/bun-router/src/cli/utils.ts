import process from 'node:process'
import chalk from 'chalk'

/**
 * Formats console output with consistent styling
 */
export const format = {
  success: (message: string): string => chalk.green(`✨ ${message}`),
  info: (message: string): string => chalk.blue(message),
  warning: (message: string): string => chalk.yellow(message),
  error: (message: string): string => chalk.red(message),
  dim: (message: string): string => chalk.dim(message),
  bold: (message: string): string => chalk.bold(message),
}

/**
 * Logger for CLI commands with consistent styling
 */
export const logger = {
  success: (message: string): void => console.log(format.success(message)),
  info: (message: string): void => console.log(format.info(message)),
  warning: (message: string): void => console.log(format.warning(message)),
  error: (message: string): void => console.error(format.error(message)),
  debug: (message: string): void => console.debug(format.dim(message)),
}

/**
 * Load router instance from the application
 */
export async function loadRouter(): Promise<any> {
  try {
    const routesFile = `${process.cwd()}/routes/index.ts`
    const { router } = await import(routesFile)

    if (!router) {
      logger.error(`Could not find router instance in ${routesFile}.`)
      process.exit(1)
    }

    return router
  }
  catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      logger.error(`Routes file not found at ${process.cwd()}/routes/index.ts`)
      logger.warning('Make sure your routes are defined and exported as "router" in routes/index.ts')
    }
    else {
      logger.error(`Error loading router: ${error.message}`)
    }
    throw error
  }
}

/**
 * Setup a debounced file watcher
 */
export function setupDebouncedWatcher(
  callback: () => Promise<void>,
  _debounceTime = 500,
): { timeoutId: NodeJS.Timeout | null } {
  const state = { timeoutId: null as NodeJS.Timeout | null }

  return state
}

/**
 * Utility to get method color for console output
 */
export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return chalk.cyan.toString()
    case 'POST':
      return chalk.green.toString()
    case 'PUT':
      return chalk.yellow.toString()
    case 'PATCH':
      return chalk.yellow.toString()
    case 'DELETE':
      return chalk.red.toString()
    case 'OPTIONS':
      return chalk.gray.toString()
    default:
      return chalk.white.toString()
  }
}

/**
 * Pad a string to a specified length
 */
export function padString(str: string, length: number): string {
  return (str + ' '.repeat(length)).substring(0, length)
}
