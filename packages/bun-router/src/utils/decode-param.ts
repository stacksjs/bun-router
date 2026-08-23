/**
 * Path params, decoded — once.
 *
 * The matchers took the raw path segment, so `/f/{name}` given
 * `/f/caf%C3%A9` handed the handler the literal `caf%C3%A9`, and a space
 * arrived as `%20`. Every consumer had to decode, which means every consumer
 * that forgot had a bug, and the one framework that remembered
 * (`@stacksjs/router`) had to do it in a wrapper.
 *
 * Doing it here rather than in a wrapper is what makes it exactly once. Two
 * layers each calling `decodeURIComponent` turn `%2520` into a space, and a
 * double decode is how a filter that rejects `../` gets walked past.
 *
 * Note for handlers: a decoded param CAN contain `/` (from `%2F`) — that is
 * the point of encoding it — so anything joining a param into a filesystem
 * path still has to sanitise. Decoding makes the value correct, not safe.
 */
export function decodeParam(value: string): string {
  // `%` is the only thing `decodeURIComponent` can act on, and the
  // overwhelming majority of params carry none.
  if (!value.includes('%'))
    return value

  try {
    return decodeURIComponent(value)
  }
  catch {
    // A malformed escape (`%ZZ`) is the client's problem to explain, not a
    // reason to fail the request before the handler has seen it.
    return value
  }
}
