/**
 * The token in an `Authorization: Bearer <token>` header, or `null`.
 *
 * The scheme name is case-insensitive (RFC 9110 section 11.1), and one or
 * more spaces may separate it from the token. Each caller here tested
 * `startsWith('Bearer ')`, so `bearer abc` was no token at all - while a CSRF
 * check reading the same header case-insensitively treated the request as
 * token-authenticated and exempt. The request then authenticated by its
 * cookie with the CSRF check skipped.
 */
export function parseBearerToken(header: string | null | undefined): string | null {
  if (!header)
    return null
  const match = /^bearer +(\S.*)$/i.exec(header.trim())
  return match ? match[1]!.trim() : null
}
