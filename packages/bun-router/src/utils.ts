import type { ActionHandler, ActionHandlerClass, RouteHandler } from './types'
import { join } from 'node:path'
import { decodeParam } from './utils/decode-param'

// Re-export query preservation utilities
export * from './utils/query-preservation'

/**
 * Normalizes a path by ensuring it starts with a forward slash and has no trailing slash
 * @param path The path to normalize
 */
export function normalizePath(path: string): string {
  // First replace double (or more) slashes with a single slash
  let normalizedPath = path.replace(/\/+/g, '/')

  // Then ensure there's a leading slash and no trailing slash (unless it's just /)
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`
  }

  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1)
  }

  return normalizedPath
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
  if (typeof handler !== 'function' && typeof handler !== 'object') {
    return false
  }

  // Check if it's a class constructor
  if (typeof handler === 'function' && handler.prototype) {
    const prototype = handler.prototype as unknown as { handle?: unknown }
    if (typeof prototype.handle === 'function') {
      return true
    }
  }

  // Check if it's an instance with a handle method
  if (typeof handler === 'object' && handler !== null && 'handle' in handler && typeof (handler as any).handle === 'function') {
    return true
  }

  return false
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
  return matches ? matches.map(m => m.slice(1, -1).replace('?', '')) : []
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
 * Per-pattern matching data. A route's pattern never changes, so the
 * segment split, param-name extraction, and optional-param count are derived
 * once and cached — turning `matchPath` from "regex + split on every request"
 * into a tight array walk. Only the incoming `path` is processed per call.
 */
interface CompiledSegment {
  isParam: boolean
  paramName: string
  isOptional: boolean
  literal: string
}

interface CompiledPattern {
  isWildcard: boolean
  wildcardBase: string
  segments: CompiledSegment[]
  optionalCount: number
}

const PARAM_SEGMENT_RE = /\{([^}:]+)(?::[^}]+)?(\?)?\}/
const OPTIONAL_SEGMENT_RE = /\{[^}]+\?\}/

const compiledPatternCache = new Map<string, CompiledPattern>()
// Cached compiled constraint regexes; `null` marks an invalid pattern so we
// don't re-attempt construction on every request.
const constraintRegexCache = new Map<string, RegExp | null>()

function compilePattern(pattern: string): CompiledPattern {
  const cached = compiledPatternCache.get(pattern)
  if (cached)
    return cached

  const isWildcard = pattern.endsWith('/*')
  const normalizedPattern = normalizePath(pattern)
  let optionalCount = 0
  const segments: CompiledSegment[] = normalizedPattern
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      const isOptional = OPTIONAL_SEGMENT_RE.test(seg)
      if (isOptional)
        optionalCount++
      const paramMatch = seg.match(PARAM_SEGMENT_RE)
      return {
        isParam: !!paramMatch,
        paramName: paramMatch ? paramMatch[1].replace('?', '') : '',
        isOptional,
        literal: seg,
      }
    })

  const compiled: CompiledPattern = {
    isWildcard,
    wildcardBase: isWildcard ? pattern.slice(0, -2) : '',
    segments,
    optionalCount,
  }
  compiledPatternCache.set(pattern, compiled)
  return compiled
}

function getConstraintRegex(constraint: string): RegExp | null {
  const cached = constraintRegexCache.get(constraint)
  if (cached !== undefined)
    return cached
  let regex: RegExp | null
  try {
    regex = new RegExp(`^${constraint}$`)
  }
  catch {
    regex = null
  }
  constraintRegexCache.set(constraint, regex)
  return regex
}

/**
 * Matches a path against a pattern and extracts parameters
 * @param pattern The path pattern (e.g., '/users/{id}')
 * @param path The actual path (e.g., '/users/123')
 * @param params Output parameter object that will contain extracted parameters
 * @param constraints Optional constraints for route parameters
 * @returns Boolean indicating whether the path matches the pattern
 */
export function matchPath(
  pattern: string,
  path: string,
  params: Record<string, string>,
  constraints?: Record<string, string>,
): boolean {
  const compiled = compilePattern(pattern)

  // Special case for wildcard patterns. Matches the original semantics:
  // a prefix hit short-circuits to true, otherwise we fall through to the
  // per-segment match below.
  if (compiled.isWildcard && path.startsWith(compiled.wildcardBase)) {
    return true
  }

  const patternSegments = compiled.segments
  const pathSegments = normalizePath(path).split('/').filter(Boolean)

  // Quick check - if segments don't match (accounting for optional params) then no match
  // For mandatory parameters, the pattern and path must have same number of segments
  if (pathSegments.length < patternSegments.length - compiled.optionalCount
    || pathSegments.length > patternSegments.length) {
    return false
  }

  // Match each segment
  for (let i = 0; i < patternSegments.length; i++) {
    const seg = patternSegments[i]
    const pathSegment = pathSegments[i]

    // If we've run out of path segments and this is not an optional parameter
    if (pathSegment === undefined) {
      if (seg.isOptional) {
        // This is an optional parameter and we have no path segment for it
        continue
      }
      // Required parameter or static segment with no matching path segment
      return false
    }

    if (seg.isParam) {
      // Decoded before the constraint runs, so a constraint and the stored
      // value never disagree about what the segment says. See `decodeParam`.
      const decodedSegment = decodeParam(pathSegment)
      params[seg.paramName] = decodedSegment

      // Check constraints if they exist
      if (constraints && constraints[seg.paramName]) {
        const regex = getConstraintRegex(constraints[seg.paramName])
        if (regex) {
          if (!regex.test(decodedSegment)) {
            return false
          }
        }
        else {
          // If regex is invalid, treat as no constraint
          console.warn(`Invalid constraint regex for parameter ${seg.paramName}: ${constraints[seg.paramName]}`)
        }
      }
    }
    else if (seg.literal !== pathSegment) {
      // Static segment doesn't match
      return false
    }
  }

  return true
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
export function processHtmlTemplate(template: string, data: Record<string, unknown>): string {
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
function processConditionals(template: string, data: Record<string, unknown>): string {
  // Match {{#if condition}} content {{/if}} or {{#if condition}} content {{else}} alternative {{/if}}
  return template.replace(
    /\{\{#if ([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_match, condition, content, alternative = '') => {
      const conditionTrimmed = condition.trim()
      const value = getNestedValue(data, conditionTrimmed)
      // Explicitly check for falsy values (false, undefined, null, 0, "")
      return value ? content : alternative
    },
  )
}

/**
 * Process loop statements in templates
 */
function processLoops(template: string, data: Record<string, unknown>): string {
  // Match {{#each items}} content {{/each}}
  return template.replace(
    /\{\{#each ([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, arrayKey, content) => {
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
          .replace(/\{\{this\.([^}]+)\}\}/g, (_matchStr: string, prop: string) => {
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
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((prev, curr) => {
    if (prev && typeof prev === 'object' && curr in prev) {
      return (prev as Record<string, unknown>)[curr]
    }
    return undefined
  }, obj)
}
