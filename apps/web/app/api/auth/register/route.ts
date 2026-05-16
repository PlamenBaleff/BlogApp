import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, registerSchema } from '@bloghub/api';
import { db, users, refreshTokens } from '@bloghub/db';
import { generateAccessToken, generateRefreshToken } from '@bloghub/api';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name, password } = validation.data;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
      })
      .returning();

    // Generate tokens
    const accessToken = generateAccessToken(newUser.id, newUser.email);
    const refreshToken = generateRefreshToken(newUser.id);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await db.insert(refreshTokens).values({
      userId: newUser.id,
      token: refreshToken,
      expiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
