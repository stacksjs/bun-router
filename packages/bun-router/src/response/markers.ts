export const ENRICHED_NOT_FOUND_RESPONSE: unique symbol = Symbol.for('@stacksjs/bun-router:enriched-not-found-response')

export function markEnrichedNotFoundResponse(response: Response): Response {
  const marked = response as Response & { [ENRICHED_NOT_FOUND_RESPONSE]?: true }
  marked[ENRICHED_NOT_FOUND_RESPONSE] = true
  return response
}
