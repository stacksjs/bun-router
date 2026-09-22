import type { EnhancedRequest, MiddlewareHandler } from '../types'

export type CompiledMiddlewareChain = (request: EnhancedRequest) => Response | null | Promise<Response | null>
export type PublicMiddlewareChain = (request: EnhancedRequest) => Promise<Response | null>

interface MiddlewareChainHost {
  buildMiddlewareChain: (middlewares: MiddlewareHandler[]) => PublicMiddlewareChain
}

function normalizeMiddlewareResult(result: Response | null | Promise<Response | null>): Response | null | Promise<Response | null> {
  if (result === null || result instanceof Response)
    return result
  return Promise.resolve(result)
}

function continueMiddleware(result: Response | null | Promise<Response | null>): Response | Promise<Response> {
  const normalized = normalizeMiddlewareResult(result)
  if (normalized instanceof Promise)
    return normalized.then(response => response || new Response(null, { status: 200 }))
  return normalized || new Response(null, { status: 200 })
}

export function compileMiddlewareChain(middlewares: MiddlewareHandler[]): CompiledMiddlewareChain {
  if (middlewares.length === 0)
    return () => null

  let chain: CompiledMiddlewareChain = () => null

  for (let index = middlewares.length - 1; index >= 0; index--) {
    const middleware = middlewares[index]
    const nextChain = chain
    chain = (request) => {
      try {
        return normalizeMiddlewareResult(middleware(request, () => {
          try {
            return continueMiddleware(nextChain(request))
          }
          catch (error) {
            return Promise.reject(error)
          }
        }))
      }
      catch (error) {
        return Promise.reject(error)
      }
    }
  }

  return chain
}

export function buildMiddlewareChain(middlewares: MiddlewareHandler[]): PublicMiddlewareChain {
  const chain = compileMiddlewareChain(middlewares)
  return request => Promise.resolve(chain(request))
}

export function resolveMiddlewareChain(host: MiddlewareChainHost, middlewares: MiddlewareHandler[]): CompiledMiddlewareChain {
  if (host.buildMiddlewareChain === buildMiddlewareChain)
    return compileMiddlewareChain(middlewares)

  const chain = host.buildMiddlewareChain(middlewares)
  return request => normalizeMiddlewareResult(chain(request))
}
