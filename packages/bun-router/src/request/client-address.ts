/**
 * Who sent this request: the client's address, as far as it can be trusted.
 *
 * Every forwarding header is written by whoever is on the other end of the
 * socket. `X-Forwarded-For: 1.2.3.4` from a browser that connected directly
 * says nothing about the browser - it is a string the browser chose. A header
 * only carries information when the peer that sent it is a proxy we run, and
 * then only the hops that proxy (and the proxies before it that we also run)
 * appended.
 *
 * The rate limiter used to take the FIRST `X-Forwarded-For` entry, which is the
 * one hop a client always controls: prefix the header with a fresh address and
 * every request got a fresh budget. Behind a gateway that overwrites the header
 * with its own socket peer, the first entry was instead the CDN edge that
 * connected, so every visitor routed through one edge shared one budget.
 *
 * `clientAddress()` does what a proxy-aware server has to:
 *
 * 1. Read the socket peer. If it is not a trusted proxy, it IS the client and
 *    no header is consulted.
 * 2. Otherwise walk `X-Forwarded-For` (or `X-Real-IP`) from the right, skipping
 *    trusted proxies. The first address that is not one is the client.
 * 3. If that address belongs to Cloudflare, the request came through
 *    Cloudflare, which states the visitor in `CF-Connecting-IP` and overwrites
 *    any value a client sent. Believe it then, and only then: a client that
 *    reaches the origin directly can send the same header, and its connection
 *    will not come from a Cloudflare address.
 */
import { BlockList, isIP } from 'node:net'

export interface ClientAddressOptions {
  /**
   * Proxies whose forwarding headers are believed, as addresses or CIDR
   * ranges. Defaults to loopback, private and link-local networks
   * (`PRIVATE_NETWORK_RANGES`): a gateway on the same box or the same private
   * network. A public address is never trusted unless listed here.
   */
  trustedProxies?: readonly string[]
  /**
   * Believe `CF-Connecting-IP` when the hop that delivered the request is a
   * Cloudflare address (`CLOUDFLARE_IP_RANGES`). Defaults to true; it costs
   * nothing for an app not behind Cloudflare, since no hop will match.
   */
  cloudflare?: boolean
}

/** Loopback, RFC 1918 / RFC 4193 private networks, and link-local. */
export const PRIVATE_NETWORK_RANGES: readonly string[] = Object.freeze([
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
])

/**
 * Cloudflare's published edge ranges (https://www.cloudflare.com/ips/).
 * Cloudflare changes these rarely and announces it in advance; pass
 * `trustedProxies` plus your own list if you need to track them live.
 */
export const CLOUDFLARE_IP_RANGES: readonly string[] = Object.freeze([
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
])

interface PeerSource {
  requestIP: (req: Request) => { address: string } | null
}

/**
 * The server that answers `requestIP()`.
 *
 * Bun resolves a request's socket from the request itself, so any server
 * instance can name the peer of any request it was handed - including one
 * that has since stopped. The router records the server it starts here so
 * that code holding only a request (middleware, a key generator) can ask.
 */
let peerSource: PeerSource | undefined

/** Record the server whose `requestIP()` names request peers. Called by `Router#serve`. */
export function registerPeerSource(server: PeerSource | undefined): void {
  if (server && typeof server.requestIP === 'function')
    peerSource = server
}

/**
 * The address on the other end of the request's socket, or `null` when there
 * is none to read: a request built in-process (a test, a proxy calling
 * `handleRequest` directly) or one that arrived over a Unix socket.
 */
export function peerAddress(req: Request): string | null {
  if (!peerSource)
    return null
  try {
    const address = peerSource.requestIP(req)?.address
    return address ? normalizeAddress(address) : null
  }
  catch {
    return null
  }
}

const listCache = new WeakMap<readonly string[], BlockList>()

function blockListFor(ranges: readonly string[]): BlockList {
  let list = listCache.get(ranges)
  if (list)
    return list
  list = new BlockList()
  for (const range of ranges) {
    const [address, prefix] = range.split('/')
    const family = isIP(address)
    if (family === 0)
      continue
    const type = family === 4 ? 'ipv4' : 'ipv6'
    if (prefix === undefined)
      list.addAddress(address, type)
    else
      list.addSubnet(address, Number(prefix), type)
  }
  listCache.set(ranges, list)
  return list
}

/** Whether `address` falls inside any of `ranges` (addresses or CIDR blocks). */
export function addressInRanges(address: string, ranges: readonly string[]): boolean {
  const family = isIP(address)
  if (family === 0)
    return false
  return blockListFor(ranges).check(address, family === 4 ? 'ipv4' : 'ipv6')
}

/**
 * One hop as a bare address: brackets and ports stripped, IPv4-mapped IPv6
 * (`::ffff:1.2.3.4`) written as the IPv4 it is. Returns the trimmed input when
 * it is not an address at all, bounded so a stranger's header cannot become a
 * kilobyte-long cache key.
 */
export function normalizeAddress(raw: string): string {
  let value = raw.trim()
  if (value.startsWith('[')) {
    const end = value.indexOf(']')
    if (end > 0)
      value = value.slice(1, end)
  }
  else if (value.includes('.') && value.lastIndexOf(':') > value.lastIndexOf('.')) {
    // `1.2.3.4:5678`
    value = value.slice(0, value.lastIndexOf(':'))
  }
  if (/^::ffff:\d{1,3}(?:\.\d{1,3}){3}$/i.test(value))
    value = value.slice(7)
  return value.slice(0, 64)
}

function forwardedHops(req: Request): string[] {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const hops = forwardedFor.split(',').map(normalizeAddress).filter(Boolean)
    if (hops.length > 0)
      return hops
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    const hop = normalizeAddress(realIp)
    if (hop)
      return [hop]
  }
  return []
}

/**
 * The client's address, believing forwarding headers only as far as trusted
 * proxies vouch for them (see the module comment). Returns `null` only when
 * there is nothing at all to go on: no socket peer and no forwarding header.
 *
 * A request with no readable socket peer was handed to the router in-process,
 * so whoever constructed it is part of the application; its headers are read
 * as a trusted proxy's would be.
 */
export function clientAddress(req: Request, options: ClientAddressOptions = {}): string | null {
  const trusted = options.trustedProxies ?? PRIVATE_NETWORK_RANGES
  const peer = peerAddress(req)

  if (peer && !addressInRanges(peer, trusted))
    return peer

  const hops = forwardedHops(req)
  let client: string | null = peer
  for (let i = hops.length - 1; i >= 0; i--) {
    client = hops[i]
    if (!addressInRanges(client, trusted))
      break
  }

  if (client && options.cloudflare !== false && addressInRanges(client, CLOUDFLARE_IP_RANGES)) {
    const visitor = req.headers.get('cf-connecting-ip')
    if (visitor) {
      const address = normalizeAddress(visitor)
      if (isIP(address) !== 0)
        return address
    }
  }

  return client
}
