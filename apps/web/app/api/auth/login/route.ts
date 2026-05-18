import { NextRequest, NextResponse } from 'next/server';
import { loginSchema, verifyPassword } from '@bloghub/api';
import { db, users, refreshTokens } from '@bloghub/db';
import { generateAccessToken, generateRefreshToken } from '@bloghub/api';
import { and, eq, lt } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate tokens. Role is embedded so server-side guards (e.g. admin
    // routes) can authorize without an extra DB hit.
    const accessToken = generateAccessToken(user.id, user.email, user.role as 'user' | 'admin');
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Garbage-collect this user's expired refresh tokens so the table doesn't
    // grow without bound on repeat logins.
    await db
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, user.id),
          lt(refreshTokens.expiresAt, new Date()),
        ),
      );

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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
