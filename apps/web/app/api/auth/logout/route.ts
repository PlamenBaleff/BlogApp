import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@bloghub/api';
import { db, refreshTokens } from '@bloghub/db';
import { and, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * POST /api/auth/logout
 *
 * Body: `{ refreshToken?: string }`
 *
 * Invalidates the supplied refresh token (so it can't be exchanged again).
 * If no token is supplied, revokes ALL refresh tokens for the caller —
 * useful for "sign out everywhere".
 *
 * Access tokens are stateless JWTs; the client is expected to discard them.
 */
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let token: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    token = typeof body?.refreshToken === 'string' ? body.refreshToken : undefined;
  } catch {
    // empty body is fine — fall through to "revoke all"
  }

  if (token) {
    await db
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, auth.payload.sub),
          eq(refreshTokens.token, token),
        ),
      );
  } else {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, auth.payload.sub));
  }

  return NextResponse.json({ success: true });
}
