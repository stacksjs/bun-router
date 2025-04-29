import Auth, {
  basicAuth,
  bearerAuth,
  jwtAuth,
  apiKeyAuth,
  oauth2Auth,
  extractBasicAuth,
  extractBearerToken,
  extractApiKey
} from './auth'
import Cors from './cors'
import Csrf from './csrf'
import JsonBody from './json_body'
import RequestId from './request_id'
import Session from './session'

// Export middleware classes
export {
  Auth,
  Cors,
  Csrf,
  JsonBody,
  RequestId,
  Session,
  // Authentication helper exports
  basicAuth,
  bearerAuth,
  jwtAuth,
  apiKeyAuth,
  oauth2Auth,
  extractBasicAuth,
  extractBearerToken,
  extractApiKey
}

// Factory functions for easier middleware creation
export const cors = (): Cors => new Cors()
export const jsonBody = (): JsonBody => new JsonBody()
export const requestId = (): RequestId => new RequestId()
export const session = (): Session => new Session()
export const csrf = (): Csrf => new Csrf()
export const auth = (): Auth => new Auth({
  type: 'bearer',
  validator: () => true // Default just passes through - must be configured correctly
})

// Named middleware mapping for string-based middleware references
export const middleware: Record<string, any> = {
  'Middleware/Cors': new Cors(),
  'Middleware/JsonBody': new JsonBody(),
  'Middleware/RequestId': new RequestId(),
  'Middleware/Session': new Session(),
  'Middleware/Csrf': new Csrf(),
  'Middleware/Auth': new Auth({
    type: 'bearer',
    validator: () => true // Default just passes through - must be configured correctly
  }),
}

export default middleware
