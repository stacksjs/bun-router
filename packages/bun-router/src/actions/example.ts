import type { EnhancedRequest } from '../types'

export default class ExampleAction {
  async handle(request: EnhancedRequest): Promise<Response> {
    return Response.json({
      message: 'Hello from Example Action!',
      params: request.params,
    })
  }
}
