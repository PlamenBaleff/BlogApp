import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@bloghub/api';
import { db, users } from '@bloghub/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { deleteFromR2ByUrl } from '../../../lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const profileColumns = {
  id: true,
  email: true,
  name: true,
  role: true,
  bio: true,
  avatar: true,
  theme: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, auth.payload.sub),
      columns: profileColumns,
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  bio: z.string().max(2000).nullable().optional(),
  avatar: z.string().url().max(2048).nullable().optional(),
  theme: z.enum(['light', 'dark']).optional(),
});

/**
 * PATCH /api/auth/me — update the caller's own profile (name / bio / avatar).
 * Email and role changes are intentionally NOT allowed here; role is admin-only
 * and email changes would require a verification flow we don't implement.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // If the avatar is changing (replaced or cleared), fetch the previous
    // value so we can delete the old object from R2 after the DB update
    // succeeds. Posting the same URL is a no-op.
    let previousAvatar: string | null = null;
    if (parsed.data.avatar !== undefined) {
      const current = await db.query.users.findFirst({
        where: eq(users.id, auth.payload.sub),
        columns: { avatar: true },
      });
      previousAvatar = current?.avatar ?? null;
    }

    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, auth.payload.sub))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        bio: users.bio,
        avatar: users.avatar,
        theme: users.theme,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Best-effort cleanup of the previous R2 object. `deleteFromR2ByUrl`
    // silently ignores URLs that aren't ours (e.g. legacy external links).
    if (
      previousAvatar &&
      previousAvatar !== updated.avatar
    ) {
      void deleteFromR2ByUrl(previousAvatar);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
