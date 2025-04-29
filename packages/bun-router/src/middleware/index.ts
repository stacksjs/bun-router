import Auth, {
  apiKeyAuth,
  basicAuth,
  bearerAuth,
  extractApiKey,
  extractBasicAuth,
  extractBearerToken,
  jwtAuth,
  oauth2Auth,
} from './auth'
import Cors from './cors'
import Csrf from './csrf'
import JsonBody from './json_body'
import RateLimit from './rate_limit'
import RequestId from './request_id'
import Session from './session'

// Export middleware classes
export {
  apiKeyAuth,
  Auth,
  // Authentication helper exports
  basicAuth,
  bearerAuth,
  Cors,
  Csrf,
  extractApiKey,
  extractBasicAuth,
  extractBearerToken,
  JsonBody,
  jwtAuth,
  oauth2Auth,
  RateLimit,
  RequestId,
  Session,
}

// Factory functions for easier middleware creation
export const cors = (): Cors => new Cors()
export const jsonBody = (): JsonBody => new JsonBody()
export const requestId = (): RequestId => new RequestId()
export const session = (): Session => new Session()
export const csrf = (): Csrf => new Csrf()
export function auth(): Auth {
  return new Auth({
    type: 'bearer',
    validator: () => true, // Default just passes through - must be configured correctly
  })
}
export const rateLimit = (options = {}): RateLimit => new RateLimit(options)

// Named middleware mapping for string-based middleware references
export const middleware: Record<string, any> = {
  'Middleware/Cors': new Cors(),
  'Middleware/JsonBody': new JsonBody(),
  'Middleware/RequestId': new RequestId(),
  'Middleware/Session': new Session(),
  'Middleware/Csrf': new Csrf(),
  'Middleware/Auth': new Auth({
    type: 'bearer',
    validator: () => true, // Default just passes through - must be configured correctly
  }),
  'Middleware/RateLimit': new RateLimit(),
}

export default middleware
