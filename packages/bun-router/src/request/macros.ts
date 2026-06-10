/**
 * Request/Response Enhancements - Request Macros
 *
 * Laravel-style request macros for enhanced request functionality
 */

import type { EnhancedRequest } from '../types'

export interface RequestMacro {
  name: string
  handler: (this: EnhancedRequest, ...args: any[]) => any
}

// Hoisted hot-path helpers — compiled once instead of per call
const MOBILE_REGEX = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
const BOT_REGEX = /bot|crawler|spider|crawling/i
const GLOB_PATTERN_CACHE = new Map<string, RegExp>()

/** Parsed-state cache slots attached to a request on first use. */
interface RequestParseCache {
  _parsedURL?: URL
  _parsedCookies?: Record<string, string>
}

function getParsedURL(req: EnhancedRequest): URL {
  const cache = req as EnhancedRequest & RequestParseCache
  if (!cache._parsedURL) {
    cache._parsedURL = new URL(req.url)
  }
  return cache._parsedURL
}

function getParsedCookies(req: EnhancedRequest): Record<string, string> {
  const cache = req as EnhancedRequest & RequestParseCache
  if (!cache._parsedCookies) {
    const cookies: Record<string, string> = {}
    const cookieHeader = req.headers.get('cookie')
    if (cookieHeader) {
      for (const cookie of cookieHeader.split(';')) {
        const eqIndex = cookie.indexOf('=')
        if (eqIndex === -1)
          continue
        const key = cookie.slice(0, eqIndex).trim()
        if (!key)
          continue
        const value = cookie.slice(eqIndex + 1).trim()
        try {
          cookies[key] = decodeURIComponent(value)
        }
        catch {
          cookies[key] = value
        }
      }
    }
    cache._parsedCookies = cookies
  }
  return cache._parsedCookies
}

/**
 * Request macro registry
 */
class RequestMacroRegistry {
  private macros: Map<string, RequestMacro> = new Map()
  // Bumped on every mutation so cached macro prototypes can be rebuilt
  private epoch = 0

  /**
   * Register a request macro
   */
  register(name: string, handler: (this: EnhancedRequest, ...args: any[]) => any): void {
    this.macros.set(name, { name, handler })
    this.epoch++
  }

  /**
   * Get a registered macro
   */
  get(name: string): RequestMacro | undefined {
    return this.macros.get(name)
  }

  /**
   * Check if macro exists
   */
  has(name: string): boolean {
    return this.macros.has(name)
  }

  /**
   * Get all registered macros
   */
  all(): RequestMacro[] {
    return Array.from(this.macros.values())
  }

  /**
   * Remove a macro
   */
  remove(name: string): boolean {
    const removed = this.macros.delete(name)
    if (removed)
      this.epoch++
    return removed
  }

  /**
   * Clear all macros
   */
  clear(): void {
    this.macros.clear()
    this.epoch++
  }

  /**
   * Monotonic registry version (see `RequestWithMacros.applyMacros`)
   */
  getEpoch(): number {
    return this.epoch
  }
}

/**
 * Global request macro registry
 */
export const requestMacroRegistry: RequestMacroRegistry = new RequestMacroRegistry()

// Marker symbols for prototype-based macro attachment
const MACRO_PROTO = Symbol('bunRouterMacroProto')
const MACRO_BASE = Symbol('bunRouterMacroBase')

// Cache of generated macro prototypes, keyed by the request's original
// prototype. Rebuilt whenever the registry epoch moves.
let macroProtoCache = new WeakMap<object, Record<PropertyKey, unknown>>()
let macroProtoEpoch = -1

/**
 * Request class with macro support
 */
export class RequestWithMacros {
  /**
   * Register a request macro
   */
  static macro(name: string, handler: (this: EnhancedRequest, ...args: any[]) => any): void {
    requestMacroRegistry.register(name, handler)
  }

  /**
   * Apply macros to a request object.
   *
   * Macros are attached via a shared prototype inserted between the
   * request and its original prototype — one `setPrototypeOf` per
   * request. The previous implementation looped over every macro and
   * `bind`-assigned it, costing ~40 property writes and closures per
   * request on the dispatch hot path. Macro handlers receive the
   * request as `this`, so no per-request binding is needed.
   */
  static applyMacros(request: EnhancedRequest): EnhancedRequest {
    const epoch = requestMacroRegistry.getEpoch()
    if (epoch !== macroProtoEpoch) {
      macroProtoCache = new WeakMap()
      macroProtoEpoch = epoch
    }

    let base = (Object.getPrototypeOf(request) ?? Object.prototype) as Record<PropertyKey, unknown>
    if (base[MACRO_PROTO]) {
      // Request was already enhanced. Current generation: nothing to do.
      if (macroProtoCache.get(base[MACRO_BASE] as object) === base) {
        return request
      }
      // Stale generation: rebuild on top of the original prototype
      base = base[MACRO_BASE] as Record<PropertyKey, unknown>
    }

    let proto = macroProtoCache.get(base)
    if (!proto) {
      proto = Object.create(base) as Record<PropertyKey, unknown>
      for (const macro of requestMacroRegistry.all()) {
        proto[macro.name] = macro.handler
      }
      Object.defineProperty(proto, MACRO_PROTO, { value: true })
      Object.defineProperty(proto, MACRO_BASE, { value: base })
      macroProtoCache.set(base, proto)
    }

    Object.setPrototypeOf(request, proto)
    return request
  }

  /**
   * Check if macro exists
   */
  static hasMacro(name: string): boolean {
    return requestMacroRegistry.has(name)
  }
}

/**
 * Built-in request macros
 */
export const BuiltInRequestMacros = {
  /**
   * Check if request wants JSON response
   */
  wantsJson(this: EnhancedRequest): boolean {
    const accept = this.headers.get('accept') || ''
    return accept.includes('application/json') || accept.includes('json')
  },

  /**
   * Check if request wants HTML response
   */
  wantsHtml(this: EnhancedRequest): boolean {
    const accept = this.headers.get('accept') || ''
    return accept.includes('text/html') || accept.includes('html')
  },

  /**
   * Check if request wants XML response
   */
  wantsXml(this: EnhancedRequest): boolean {
    const accept = this.headers.get('accept') || ''
    return accept.includes('application/xml') || accept.includes('xml')
  },

  /**
   * Check if request expects JSON response
   */
  expectsJson(this: EnhancedRequest): boolean {
    return this.wantsJson() || this.isAjax() || this.isPjax()
  },

  /**
   * Check if request is AJAX
   */
  isAjax(this: EnhancedRequest): boolean {
    return this.headers.get('x-requested-with') === 'XMLHttpRequest'
  },

  /**
   * Check if request is PJAX
   */
  isPjax(this: EnhancedRequest): boolean {
    return this.headers.get('x-pjax') === 'true'
  },

  /**
   * Check if request is from mobile device
   */
  isMobile(this: EnhancedRequest): boolean {
    return MOBILE_REGEX.test(this.headers.get('user-agent') || '')
  },

  /**
   * Check if request is from bot/crawler
   */
  isBot(this: EnhancedRequest): boolean {
    return BOT_REGEX.test(this.headers.get('user-agent') || '')
  },

  /**
   * Check if request is secure (HTTPS)
   */
  isSecure(this: EnhancedRequest): boolean {
    return this.url.startsWith('https://')
      || this.headers.get('x-forwarded-proto') === 'https'
      || this.headers.get('x-forwarded-ssl') === 'on'
  },

  /**
   * Get client IP address
   */
  ip(this: EnhancedRequest): string {
    return this.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || this.headers.get('x-real-ip')
      || this.headers.get('cf-connecting-ip')
      || this.headers.get('x-client-ip')
      || 'unknown'
  },

  /**
   * Get all client IPs (including proxies)
   */
  ips(this: EnhancedRequest): string[] {
    const forwardedFor = this.headers.get('x-forwarded-for')
    if (forwardedFor) {
      return forwardedFor.split(',').map(ip => ip.trim())
    }
    return [BuiltInRequestMacros.ip.call(this)]
  },

  /**
   * Get user agent
   */
  userAgent(this: EnhancedRequest): string {
    return this.headers.get('user-agent') || ''
  },

  /**
   * Get referer URL
   */
  referer(this: EnhancedRequest): string | null {
    return this.headers.get('referer') || this.headers.get('referrer') || null
  },

  /**
   * Get authorization header
   */
  bearerToken(this: EnhancedRequest): string | null {
    const auth = this.headers.get('authorization')
    if (auth && auth.startsWith('Bearer ')) {
      return auth.substring(7)
    }
    return null
  },

  /**
   * Get basic auth credentials
   */
  basicAuth(this: EnhancedRequest): { username: string, password: string } | null {
    const auth = this.headers.get('authorization')
    if (auth && auth.startsWith('Basic ')) {
      try {
        const decoded = atob(auth.substring(6))
        const [username, password] = decoded.split(':')
        return { username, password }
      }
      catch {
        return null
      }
    }
    return null
  },

  /**
   * Check if request has specific header
   */
  hasHeader(this: EnhancedRequest, name: string): boolean {
    return this.headers.has(name.toLowerCase())
  },

  /**
   * Get header value with default
   */
  header(this: EnhancedRequest, name: string, defaultValue?: string): string | null {
    return this.headers.get(name.toLowerCase()) || defaultValue || null
  },

  /**
   * Get all headers as object
   */
  allHeaders(this: EnhancedRequest): Record<string, string> {
    const headers: Record<string, string> = {}
    this.headers.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  },

  /**
   * Get input value from query, body, or params
   */
  input(this: EnhancedRequest, key: string, defaultValue?: any): any {
    // Check validated data first
    if (this.validated && key in this.validated) {
      return this.validated[key]
    }

    // Check query parameters
    if (this.query && key in this.query) {
      return this.query[key]
    }

    // Check route parameters
    if (this.params && key in this.params) {
      return this.params[key]
    }

    // Check JSON body
    if (this.jsonBody && typeof this.jsonBody === 'object' && key in this.jsonBody) {
      return (this.jsonBody as Record<string, unknown>)[key]
    }

    // Check form body
    if (this.formBody && typeof this.formBody === 'object' && key in this.formBody) {
      return (this.formBody as Record<string, unknown>)[key]
    }

    return defaultValue
  },

  /**
   * Get all input data
   */
  all(this: EnhancedRequest): Record<string, unknown> {
    return {
      ...this.params,
      ...this.query,
      ...(typeof this.jsonBody === 'object' && this.jsonBody !== null ? this.jsonBody : {}),
      ...(typeof this.formBody === 'object' && this.formBody !== null ? this.formBody : {}),
      ...(typeof this.validated === 'object' && this.validated !== null ? this.validated : {}),
    }
  },

  /**
   * Get only specified input keys
   */
  only(this: EnhancedRequest, keys: string[]): Record<string, any> {
    const all = this.all()
    const result: Record<string, any> = {}

    keys.forEach((key) => {
      if (key in all) {
        result[key] = all[key]
      }
    })

    return result
  },

  /**
   * Get all input except specified keys
   */
  except(this: EnhancedRequest, keys: string[]): Record<string, any> {
    const all = this.all()
    const result: Record<string, any> = {}

    Object.keys(all).forEach((key) => {
      if (!keys.includes(key)) {
        result[key] = all[key]
      }
    })

    return result
  },

  /**
   * Check if input has specific key
   */
  has(this: EnhancedRequest, key: string): boolean {
    const all = this.all()
    return key in all && all[key] !== undefined && all[key] !== null && all[key] !== ''
  },

  /**
   * Check if input has any of the specified keys
   */
  hasAny(this: EnhancedRequest, keys: string[]): boolean {
    return keys.some(key => this.has(key))
  },

  /**
   * Check if input is missing specific key
   */
  missing(this: EnhancedRequest, key: string): boolean {
    return !this.has(key)
  },

  /**
   * Check if input is filled (not empty)
   */
  filled(this: EnhancedRequest, key: string): boolean {
    const value = this.input(key)
    if (value === null || value === undefined)
      return false
    if (typeof value === 'string')
      return value.trim().length > 0
    if (Array.isArray(value))
      return value.length > 0
    if (typeof value === 'object')
      return Object.keys(value).length > 0
    return true
  },

  /**
   * Get query parameter
   */
  getQuery(this: EnhancedRequest, key?: string, defaultValue?: any): any {
    if (!key)
      return this.query || {}
    return this.query?.[key] || defaultValue
  },

  /**
   * Get route parameter
   */
  param(this: EnhancedRequest, key: string, defaultValue?: any): any {
    return this.params?.[key] || defaultValue
  },

  /**
   * Get cookie value
   */
  cookie(this: EnhancedRequest, name: string, defaultValue?: string): string | null {
    const value = getParsedCookies(this)[name]
    return value !== undefined ? value : (defaultValue || null)
  },

  /**
   * Get all cookies
   */
  cookies(this: EnhancedRequest): Record<string, string> {
    return { ...getParsedCookies(this) }
  },

  /**
   * Get file from upload
   */
  file(this: EnhancedRequest, name: string): any {
    return this.files?.find(f => f.fieldName === name)
  },

  /**
   * Check if request has file upload
   */
  hasFile(this: EnhancedRequest, name: string): boolean {
    return !!this.files?.find(f => f.fieldName === name)
  },

  /**
   * Get request path without query string
   */
  path(this: EnhancedRequest): string {
    return getParsedURL(this).pathname
  },

  /**
   * Get request URL
   */
  fullUrl(this: EnhancedRequest): string {
    return this.url
  },

  /**
   * Get request root URL
   */
  root(this: EnhancedRequest): string {
    const url = getParsedURL(this)
    return `${url.protocol}//${url.host}`
  },

  /**
   * Check if path matches pattern
   */
  is(this: EnhancedRequest, pattern: string): boolean {
    const path = this.path()

    // Compiled glob patterns are memoized — route checks tend to reuse a
    // small set of patterns across many requests
    let regex = GLOB_PATTERN_CACHE.get(pattern)
    if (!regex) {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
      regex = new RegExp(`^${regexPattern}$`)
      if (GLOB_PATTERN_CACHE.size >= 1000) {
        GLOB_PATTERN_CACHE.clear()
      }
      GLOB_PATTERN_CACHE.set(pattern, regex)
    }
    return regex.test(path)
  },

  /**
   * Get route name (if available)
   */
  route(this: EnhancedRequest): string | null {
    return (this as any).routeName || null
  },

  /**
   * Get request fingerprint for caching
   */
  fingerprint(this: EnhancedRequest): string {
    const url = getParsedURL(this)
    const data = {
      method: this.method,
      path: url.pathname,
      query: url.search,
      ip: BuiltInRequestMacros.ip.call(this),
    }

    return btoa(JSON.stringify(data))
  },

  /**
   * Get request signature for security
   */
  signature(this: EnhancedRequest, secret: string): string {
    const data = `${this.method}${this.url}${BuiltInRequestMacros.ip.call(this)}${secret}`

    // Simple hash function (in production, use crypto)
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36)
  },

  /**
   * Merge additional data into request
   */
  merge(this: EnhancedRequest, data: Record<string, any>): void {
    if (!this.validated) {
      this.validated = {}
    }
    Object.assign(this.validated, data)
  },

  /**
   * Replace request data
   */
  replace(this: EnhancedRequest, data: Record<string, any>): void {
    this.validated = { ...data }
  },

  /**
   * Get request age in milliseconds
   */
  age(this: EnhancedRequest): number {
    const startTime = (this as any).startTime || Date.now()
    return Date.now() - startTime
  },

  /**
   * Check if request is from trusted proxy
   */
  isFromTrustedProxy(this: EnhancedRequest, trustedProxies: string[] = []): boolean {
    const ip = BuiltInRequestMacros.ip.call(this)
    return trustedProxies.includes(ip)
  },

  /**
   * Get request content length
   */
  contentLength(this: EnhancedRequest): number {
    const length = this.headers.get('content-length')
    return length ? Number.parseInt(length, 10) : 0
  },

  /**
   * Get request content type
   */
  contentType(this: EnhancedRequest): string | null {
    return this.headers.get('content-type')
  },

  /**
   * Check if request content type matches
   */
  isContentType(this: EnhancedRequest, type: string): boolean {
    const contentType = this.contentType()
    return contentType ? contentType.includes(type) : false
  },
}

/**
 * Register all built-in macros
 */
export function registerBuiltInRequestMacros(): void {
  Object.entries(BuiltInRequestMacros).forEach(([name, handler]) => {
    RequestWithMacros.macro(name, handler)
  })
}

/**
 * Request macro factory functions
 */
export const RequestMacroFactory = {
  /**
   * Create input validation macro
   */
  validateInput: (_rules: Record<string, string>) => {
    // eslint-disable-next-line pickier/no-unused-vars
    return function (this: EnhancedRequest): boolean {
      // This would integrate with the validation system
      // For now, return true as placeholder
      return true
    }
  },

  /**
   * Create custom header checker macro
   */
  hasCustomHeader: (headerName: string) => {
    return function (this: EnhancedRequest): boolean {
      return this.hasHeader(headerName)
    }
  },

  /**
   * Create role checker macro
   */
  hasRole: (role: string) => {
    return function (this: EnhancedRequest): boolean {
      const user = (this as any).user
      return user?.roles?.includes(role) || false
    }
  },

  /**
   * Create permission checker macro
   */
  can: (permission: string) => {
    return function (this: EnhancedRequest): boolean {
      const user = (this as any).user
      return user?.permissions?.includes(permission) || false
    }
  },
}

/**
 * Request helper utilities
 */
export const RequestHelpers = {
  /**
   * Apply macros to request
   */
  withMacros: (request: EnhancedRequest): EnhancedRequest => {
    return RequestWithMacros.applyMacros(request)
  },

  /**
   * Create request from URL and options
   */
  create: (url: string, options: RequestInit = {}): EnhancedRequest => {
    const request = new Request(url, options) as EnhancedRequest
    return RequestWithMacros.applyMacros(request)
  },

  /**
   * Parse query string to object
   */
  parseQuery: (queryString: string): Record<string, string> => {
    const params = new URLSearchParams(queryString)
    const result: Record<string, string> = {}

    params.forEach((value, key) => {
      result[key] = value
    })

    return result
  },

  /**
   * Parse cookies from header
   */
  parseCookies: (cookieHeader: string): Record<string, string> => {
    const cookies: Record<string, string> = {}

    cookieHeader.split(';').forEach((cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key && value) {
        cookies[key] = decodeURIComponent(value)
      }
    })

    return cookies
  },
}

// Auto-register built-in macros
registerBuiltInRequestMacros()
