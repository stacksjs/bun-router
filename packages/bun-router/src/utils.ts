import type { ActionHandler, ActionHandlerClass, RouteHandler } from './types'
import { join } from 'node:path'

/**
 * Normalizes a path by ensuring it starts with a forward slash and has no trailing slash
 * @param path The path to normalize
 */
export function normalizePath(path: string): string {
  return `/${path.replace(/^\/+|\/+$/g, '')}`
}

/**
 * Converts a string path to an action path for dynamic imports
 * @param path The path to convert (e.g., 'Actions/Home/IndexAction')
 */
export function toActionPath(path: string): string {
  return path.replace(/\//g, '_').toLowerCase()
}

/**
 * Checks if a handler is a class constructor implementing ActionHandlerClass
 * @param handler The handler to check
 */
export function isActionClass(handler: ActionHandler): handler is new () => ActionHandlerClass {
  return typeof handler === 'function' && 'prototype' in handler && 'handle' in handler.prototype
}

/**
 * Checks if a handler is a route handler function
 * @param handler The handler to check
 */
export function isRouteHandler(handler: ActionHandler): handler is RouteHandler {
  return typeof handler === 'function' && !isActionClass(handler)
}

/**
 * Extracts named parameters from a path pattern
 * @param pattern The path pattern (e.g., '/users/{id}/posts/{postId}')
 */
export function extractParamNames(pattern: string): string[] {
  const matches = pattern.match(/\{([^}]+)\}/g)
  return matches ? matches.map(m => m.slice(1, -1)) : []
}

/**
 * Creates a regex pattern from a path pattern
 * @param pattern The path pattern
 */
export function createPathRegex(pattern: string): RegExp {
  const regexPattern = pattern.replace(/\{([^}]+)\}/g, '([^/]+)')
  return new RegExp(`^${regexPattern}$`)
}

/**
 * Matches a path against a pattern and extracts parameters
 * @param pattern The path pattern (e.g., '/users/{id}')
 * @param path The actual path (e.g., '/users/123')
 * @param constraints Optional parameter constraints
 */
export function matchPath(pattern: string, path: string, constraints?: Record<string, string>): Record<string, string> | null {
  const regex = createPathRegex(pattern)
  const paramNames = extractParamNames(pattern)
  const matches = path.match(regex)

  if (!matches) {
    return null
  }

  const params: Record<string, string> = {}

  for (let i = 0; i < paramNames.length; i++) {
    const name = paramNames[i]
    const value = matches[i + 1]
    params[name] = value

    // Check if this parameter has a constraint
    if (constraints && constraints[name]) {
      const constraintPattern = new RegExp(`^${constraints[name]}$`)
      // If it doesn't match the constraint, return null
      if (!constraintPattern.test(value)) {
        return null
      }
    }
  }

  return params
}

/**
 * Joins path segments ensuring proper formatting
 * @param segments Path segments to join
 */
export function joinPaths(...segments: string[]): string {
  return normalizePath(segments.join('/'))
}

/**
 * Validates a route path format
 * @param path The path to validate
 */
export function validatePath(path: string): boolean {
  // Path must start with a slash
  if (!path.startsWith('/')) {
    return false
  }

  // Check for balanced curly braces
  const stack: string[] = []
  for (const char of path) {
    if (char === '{') {
      stack.push(char)
    }
    else if (char === '}') {
      if (stack.length === 0 || stack.pop() !== '{') {
        return false
      }
    }
  }

  return stack.length === 0
}

/**
 * Check if a file exists at the given path
 * @param path The file path to check
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const file = Bun.file(path)
    return await file.exists()
  }
  catch {
    return false
  }
}

/**
 * Resolve a view name to an actual file path
 * @param viewName The view name (without extension)
 * @param viewsPath The base path for views
 * @param extensions File extensions to try
 */
export async function resolveViewPath(
  viewName: string,
  viewsPath: string,
  extensions: string[],
): Promise<string | null> {
  // If viewName already contains an extension, try it directly
  if (extensions.some(ext => viewName.endsWith(ext))) {
    const fullPath = normalizePath(join(viewsPath, viewName))
    if (await fileExists(fullPath)) {
      return fullPath
    }
    return null
  }

  // Try each extension
  for (const ext of extensions) {
    const fullPath = normalizePath(join(viewsPath, `${viewName}${ext}`))
    if (await fileExists(fullPath)) {
      return fullPath
    }
  }

  return null
}

/**
 * Basic HTML template processing - replaces {{ varName }} with the corresponding value
 * @param template The HTML template string
 * @param data The data to inject into the template
 */
export function processHtmlTemplate(template: string, data: Record<string, any>): string {
  // Process general variables {{ varName }}
  let result = template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim()
    const value = getNestedValue(data, trimmedKey)
    return value !== undefined ? String(value) : match
  })

  // Process conditionals {{#if condition}} content {{/if}}
  result = processConditionals(result, data)

  // Process loops {{#each items}} content {{/each}}
  result = processLoops(result, data)

  return result
}

/**
 * Process conditional statements in templates
 */
function processConditionals(template: string, data: Record<string, any>): string {
  // Match {{#if condition}} content {{/if}} or {{#if condition}} content {{else}} alternative {{/if}}
  return template.replace(
    /\{\{#if ([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (match, condition, content, alternative = '') => {
      const value = getNestedValue(data, condition.trim())
      return value ? content : alternative
    },
  )
}

/**
 * Process loop statements in templates
 */
function processLoops(template: string, data: Record<string, any>): string {
  // Match {{#each items}} content {{/each}}
  return template.replace(
    /\{\{#each ([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, arrayKey, content) => {
      const array = getNestedValue(data, arrayKey.trim())
      if (!Array.isArray(array))
        return ''

      return array.map((item) => {
        // Replace {{@index}} with the current index
        // Replace {{this}} with the current item
        // Replace {{this.property}} with the current item's property
        return content
          .replace(/\{\{@index\}\}/g, String(array.indexOf(item)))
          .replace(/\{\{this\}\}/g, String(item))
          .replace(/\{\{this\.([^}]+)\}\}/g, (matchStr: string, prop: string) => {
            const value = item[prop.trim()]
            return value !== undefined ? String(value) : ''
          })
      }).join('')
    },
  )
}

/**
 * Get a nested value from an object using dot notation
 * @param obj The object to extract value from
 * @param path The path to the value (e.g., 'user.profile.name')
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((prev, curr) => {
    return prev && prev[curr] !== undefined ? prev[curr] : undefined
  }, obj)
}
