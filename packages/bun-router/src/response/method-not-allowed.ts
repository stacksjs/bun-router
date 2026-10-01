/**
 * The single 405 response shared by both request entry points.
 *
 * `Router.handleRequest` and the native `Bun.serve` fetch path used to build
 * this independently and had drifted to different JSON shapes — one sent
 * `{ error }`, the other `{ success, message }` — so what a client had to
 * parse depended on which entry point served the request. Both now call here.
 */
export function methodNotAllowedResponse(
  pathname: string,
  method: string,
  allowedMethods: string[],
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify({
    success: false,
    message: 'Method Not Allowed',
    path: pathname,
    method,
    allowed: allowedMethods,
  }), {
    status: 405,
    headers: { ...headers, Allow: allowedMethods.join(', ') },
  })
}
