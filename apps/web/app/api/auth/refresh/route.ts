import { NextRequest, NextResponse } from 'next/server';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@bloghub/api';
import { db, users, refreshTokens } from '@bloghub/db';
import { and, eq, gt } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * POST /api/auth/refresh
 *
 * Body: `{ refreshToken: string }`
 *
 * Exchanges a still-valid refresh token for a new access token (and rotates
 * the refresh token to mitigate replay). The old refresh token is deleted
 * from the database so it can't be reused.
 *
 * Errors:
 *   - 400 → missing/malformed body
 *   - 401 → token missing from DB, expired, or signature invalid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const incoming =
      typeof body?.refreshToken === 'string' ? body.refreshToken : null;
    if (!incoming) {
      return NextResponse.json(
        { error: 'refreshToken is required' },
        { status: 400 },
      );
    }

    const decoded = verifyRefreshToken(incoming);
    if (!decoded || decoded.type !== 'refresh') {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 },
      );
    }

    // The token must still exist in DB AND not be past its expiry.
    const stored = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.token, incoming),
        eq(refreshTokens.userId, decoded.sub),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    });
    if (!stored) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.sub),
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Rotate: delete old, issue a new pair.
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

    const accessToken = generateAccessToken(
      user.id,
      user.email,
      user.role as 'user' | 'admin',
    );
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
