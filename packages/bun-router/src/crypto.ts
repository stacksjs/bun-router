let cryptoModule: typeof import('node:crypto') | undefined

/** Load native crypto only when authentication or middleware needs it. */
export function getNodeCrypto(): typeof import('node:crypto') {
  return cryptoModule ??= require('node:crypto')
}
