import { verifyAccessToken } from './jwt';
import type { JWTPayload } from '@bloghub/types';

/**
 * Extract and verify the JWT from a Headers/Request-like object.
 * Returns the decoded payload or null when invalid/missing.
 */
export function getAuthPayload(
  source: Headers | Request | { headers: Headers }
): JWTPayload | null {
  const headers: Headers =
    source instanceof Headers
      ? source
      : 'headers' in source
        ? source.headers
        : (source as Request).headers;

  const header = headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  return verifyAccessToken(token);
}

export type AuthResult =
  | { payload: JWTPayload }
  | { error: 'unauthorized' };

/**
 * Returns the JWT payload or an `unauthorized` error sentinel.
 * Lets route handlers build their own Response while keeping logic in one place.
 */
export function requireAuth(
  source: Headers | Request | { headers: Headers }
): AuthResult {
  const payload = getAuthPayload(source);
  if (!payload) return { error: 'unauthorized' };
  return { payload };
}
