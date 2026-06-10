import type { HTTPMethod, Route } from '../types'

/**
 * Route segment types for the trie
 */
export type RouteSegmentType = 'static' | 'parameter' | 'wildcard' | 'optional'

export interface RouteSegment {
  type: RouteSegmentType
  value: string
  paramName?: string
  pattern?: RegExp
  optional?: boolean
}

export interface CompiledRoute {
  route: Route
  segments: RouteSegment[]
  paramNames: string[]
  priority: number
  staticScore: number
  dynamicScore: number
}

/**
 * Trie node for efficient route matching
 */
export class TrieNode {
  children: Map<string, TrieNode> = new Map()
  paramChild: TrieNode | null = null
  wildcardChild: TrieNode | null = null
  routes: Map<HTTPMethod, CompiledRoute> = new Map()
  paramName: string | null = null
  pattern: RegExp | null = null
  isEndpoint: boolean = false

  /**
   * Add a route to this node
   */
  addRoute(method: HTTPMethod, compiledRoute: CompiledRoute): void {
    this.routes.set(method, compiledRoute)
    this.isEndpoint = true
  }

  /**
   * Get route for a specific HTTP method
   */
  getRoute(method: HTTPMethod): CompiledRoute | undefined {
    return this.routes.get(method)
  }

  /**
   * Get all routes at this node
   */
  getAllRoutes(): CompiledRoute[] {
    return Array.from(this.routes.values())
  }
}

/**
 * Route matching result with extracted parameters
 */
export interface RouteMatch {
  route: Route
  params: Record<string, string>
  score: number
}

/**
 * High-performance route trie for O(log n) route matching
 */
export class RouteTrie {
  private root: TrieNode = new TrieNode()
  private compiledRoutes: Map<string, CompiledRoute> = new Map()
  private methodTries: Map<HTTPMethod, TrieNode> = new Map()

  constructor() {
    // Initialize method-specific tries for faster filtering
    const methods: HTTPMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT']
    for (const method of methods) {
      this.methodTries.set(method, new TrieNode())
    }
  }

  /**
   * Compile a route pattern into segments
   */
  compileRoute(route: Route): CompiledRoute {
    // Include constraints in the cache key if present
    let cacheKey = `${route.method}:${route.path}`
    if (route.constraints && !Array.isArray(route.constraints)) {
      const constraintsRecord = route.constraints as Record<string, string>
      const constraintKeys = Object.keys(constraintsRecord).sort()
      const constraintString = constraintKeys
        .map(key => `${key}:${constraintsRecord[key]}`)
        .join('|')
      cacheKey = `${route.method}:${route.path}#${constraintString}`
    }

    if (this.compiledRoutes.has(cacheKey)) {
      return this.compiledRoutes.get(cacheKey)!
    }

    const segments = this.parsePathSegments(route.path)
    const paramNames = segments
      .filter(seg => seg.type === 'parameter')
      .map(seg => seg.paramName!)

    // Apply constraints to segments if they exist
    if (route.constraints && !Array.isArray(route.constraints)) {
      const constraintsRecord = route.constraints as Record<string, string>
      for (const segment of segments) {
        if (segment.type === 'parameter' && segment.paramName
          && constraintsRecord[segment.paramName]) {
          segment.pattern = new RegExp(`^${constraintsRecord[segment.paramName]}$`)
        }
      }
    }

    const priority = this.calculateRoutePriority(segments)
    const staticScore = segments.filter(seg => seg.type === 'static').length
    const dynamicScore = segments.filter(seg => seg.type !== 'static').length

    const compiled: CompiledRoute = {
      route,
      segments,
      paramNames,
      priority,
      staticScore,
      dynamicScore,
    }

    this.compiledRoutes.set(cacheKey, compiled)
    return compiled
  }

  /**
   * Parse path into segments
   */
  private parsePathSegments(path: string): RouteSegment[] {
    const segments: RouteSegment[] = []
    const parts = path.split('/').filter(part => part.length > 0)

    for (const part of parts) {
      if (part === '*') {
        segments.push({
          type: 'wildcard',
          value: '*',
        })
      }
      else if (part.startsWith('{') && part.endsWith('}')) {
        const paramPart = part.slice(1, -1)
        const [paramName, pattern] = paramPart.split(':')

        segments.push({
          type: 'parameter',
          value: part,
          paramName: paramName.replace('?', ''),
          pattern: pattern ? new RegExp(`^${pattern}$`) : undefined,
          optional: paramPart.endsWith('?'),
        })
      }
      else if (part.includes('{')) {
        // Mixed static/dynamic segment like "user-{id}"
        const regex = part.replace(/\{([^}:]+)(?::([^}]+))?\}/g, (_match, _name, pattern) => {
          return pattern ? `(${pattern})` : '([^/]+)'
        })

        const paramNames = Array.from(part.matchAll(/\{([^}:]+)(?::([^}]+))?\}/g))
          .map(match => match[1].replace('?', ''))

        segments.push({
          type: 'parameter',
          value: part,
          paramName: paramNames[0], // For simplicity, use first param name
          pattern: new RegExp(`^${regex}$`),
        })
      }
      else {
        segments.push({
          type: 'static',
          value: part,
        })
      }
    }

    return segments
  }

  /**
   * Calculate route priority (higher = more specific)
   */
  private calculateRoutePriority(segments: RouteSegment[]): number {
    let priority = 0

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const positionWeight = segments.length - i // Earlier segments have higher weight

      switch (segment.type) {
        case 'static':
          priority += positionWeight * 1000
          break
        case 'parameter':
          if (segment.pattern) {
            priority += positionWeight * 100 // Constrained params have higher priority
          }
          else {
            priority += positionWeight * 10
          }
          break
        case 'wildcard':
          priority += positionWeight * 1 // Wildcards have lowest priority
          break
      }
    }

    return priority
  }

  /**
   * Add a route to the trie
   */
  addRoute(route: Route): void {
    const compiled = this.compileRoute(route)

    // Add to main trie
    this.insertRoute(this.root, compiled, 0)

    // Add to method-specific trie for faster filtering
    const methodTrie = this.methodTries.get(route.method as HTTPMethod)
    if (methodTrie) {
      this.insertRoute(methodTrie, compiled, 0)
    }
  }

  /**
   * Insert compiled route into trie
   */
  private insertRoute(node: TrieNode, compiled: CompiledRoute, segmentIndex: number): void {
    if (segmentIndex >= compiled.segments.length) {
      node.addRoute(compiled.route.method as HTTPMethod, compiled)
      return
    }

    const segment = compiled.segments[segmentIndex]

    switch (segment.type) {
      case 'static':
        if (!node.children.has(segment.value)) {
          node.children.set(segment.value, new TrieNode())
        }
        this.insertRoute(node.children.get(segment.value)!, compiled, segmentIndex + 1)
        break

      case 'parameter':
        if (!node.paramChild) {
          node.paramChild = new TrieNode()
          node.paramChild.paramName = segment.paramName!
          node.paramChild.pattern = segment.pattern || null
        }
        this.insertRoute(node.paramChild, compiled, segmentIndex + 1)
        break

      case 'wildcard':
        if (!node.wildcardChild) {
          node.wildcardChild = new TrieNode()
        }
        this.insertRoute(node.wildcardChild, compiled, segmentIndex + 1)
        break
    }
  }

  /**
   * Match a path against the trie
   */
  match(path: string, method: HTTPMethod): RouteMatch | null {
    const segments = path.split('/').filter(seg => seg.length > 0)

    // Try method-specific trie first for better performance
    const methodTrie = this.methodTries.get(method)
    if (methodTrie) {
      const result = this.matchSegments(methodTrie, segments, 0, {}, method)
      if (result)
        return result
    }

    // Fallback to main trie
    return this.matchSegments(this.root, segments, 0, {}, method)
  }

  /**
   * Recursively match path segments.
   *
   * Candidates are tried in specificity order — static, then parameter,
   * then wildcard — and the first full match wins. This both fixes the
   * old behavior (where a wildcard sibling could shadow a static route)
   * and avoids allocating candidate arrays and params copies per segment:
   * `params` is mutated in place and rolled back on backtrack.
   */
  private matchSegments(
    node: TrieNode,
    segments: string[],
    segmentIndex: number,
    params: Record<string, string>,
    method: HTTPMethod,
  ): RouteMatch | null {
    // If we've matched all segments, check for route
    if (segmentIndex >= segments.length) {
      const compiled = node.getRoute(method)
      if (compiled) {
        return {
          route: compiled.route,
          params,
          score: compiled.priority,
        }
      }
      return null
    }

    const segment = segments[segmentIndex]

    // Try static match first (highest priority)
    const staticChild = node.children.get(segment)
    if (staticChild) {
      const match = this.matchSegments(staticChild, segments, segmentIndex + 1, params, method)
      if (match)
        return match
    }

    // Try parameter match
    const paramNode = node.paramChild
    if (paramNode && paramNode.paramName
      && (!paramNode.pattern || paramNode.pattern.test(segment))) {
      const previous = params[paramNode.paramName]
      params[paramNode.paramName] = segment
      const match = this.matchSegments(paramNode, segments, segmentIndex + 1, params, method)
      if (match)
        return match
      // Backtrack: restore params before trying lower-priority branches
      if (previous === undefined)
        delete params[paramNode.paramName]
      else
        params[paramNode.paramName] = previous
    }

    // Try wildcard match (lowest priority) — consumes all remaining segments
    if (node.wildcardChild) {
      const compiled = node.wildcardChild.getRoute(method)
      if (compiled) {
        params.wildcard = segments.slice(segmentIndex).join('/')
        return {
          route: compiled.route,
          params,
          score: compiled.priority,
        }
      }
    }

    return null
  }

  /**
   * Get all routes for debugging
   */
  getAllRoutes(): CompiledRoute[] {
    return Array.from(this.compiledRoutes.values())
  }

  /**
   * Remove a route from the trie
   */
  removeRoute(route: Route): void {
    // Generate the cache key for this route
    let cacheKey = `${route.method}:${route.path}`
    if (route.constraints && !Array.isArray(route.constraints)) {
      const constraintsRecord = route.constraints as Record<string, string>
      const constraintKeys = Object.keys(constraintsRecord).sort()
      const constraintString = constraintKeys
        .map(key => `${key}:${constraintsRecord[key]}`)
        .join('|')
      cacheKey = `${route.method}:${route.path}#${constraintString}`
    }

    // Remove from compiled routes cache
    this.compiledRoutes.delete(cacheKey)

    // We don't actually need to remove nodes from the trie structure
    // since we'll be adding the updated route back immediately
    // This is a performance optimization to avoid complex trie node removal
  }

  /**
   * Clear the trie
   */
  clear(): void {
    this.root = new TrieNode()
    this.compiledRoutes.clear()

    for (const [method] of this.methodTries) {
      this.methodTries.set(method, new TrieNode())
    }
  }

  /**
   * Get trie statistics for debugging
   */
  getStats(): {
    totalRoutes: number
    totalNodes: number
    averageDepth: number
    methodDistribution: Record<string, number>
  } {
    const stats = {
      totalRoutes: this.compiledRoutes.size,
      totalNodes: this.countNodes(this.root),
      averageDepth: 0,
      methodDistribution: {} as Record<string, number>,
    }

    // Calculate method distribution
    for (const compiled of this.compiledRoutes.values()) {
      const method = compiled.route.method
      stats.methodDistribution[method] = (stats.methodDistribution[method] || 0) + 1
    }

    return stats
  }

  /**
   * Count total nodes in trie
   */
  private countNodes(node: TrieNode): number {
    let count = 1

    for (const child of node.children.values()) {
      count += this.countNodes(child)
    }

    if (node.paramChild) {
      count += this.countNodes(node.paramChild)
    }

    if (node.wildcardChild) {
      count += this.countNodes(node.wildcardChild)
    }

    return count
  }
}
