import Auth from './auth'
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
}

// Factory functions for easier middleware creation
export const cors = (): Cors => new Cors()
export const jsonBody = (): JsonBody => new JsonBody()
export const requestId = (): RequestId => new RequestId()
export const session = (): Session => new Session()
export const csrf = (): Csrf => new Csrf()
export const auth = (): Auth => new Auth()

// Named middleware mapping for string-based middleware references
export const middleware: Record<string, Cors | JsonBody | RequestId | Session | Csrf | Auth> = {
  'Middleware/Cors': new Cors(),
  'Middleware/JsonBody': new JsonBody(),
  'Middleware/RequestId': new RequestId(),
  'Middleware/Session': new Session(),
  'Middleware/Csrf': new Csrf(),
  'Middleware/Auth': new Auth(),
}

export default middleware
