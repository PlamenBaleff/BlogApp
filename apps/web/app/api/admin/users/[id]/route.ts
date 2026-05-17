import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@bloghub/api';
import { db, users } from '@bloghub/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
});

/**
 * PATCH /api/admin/users/:id (admin only)
 *
 * Currently used to promote/demote users between `user` and `admin`.
 * Admins cannot demote themselves to prevent locking out the last admin.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(request);
  if ('error' in auth) {
    const status = auth.error === 'unauthorized' ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.role && id === auth.payload.sub && parsed.data.role !== 'admin') {
    return NextResponse.json(
      { error: "You can't demote yourself" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updated });
}

/**
 * DELETE /api/admin/users/:id (admin only)
 *
 * Hard-deletes a user. Cascades remove their posts, comments and refresh
 * tokens. Admins cannot delete themselves.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(request);
  if ('error' in auth) {
    const status = auth.error === 'unauthorized' ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }

  const { id } = await params;
  if (id === auth.payload.sub) {
    return NextResponse.json(
      { error: "You can't delete your own account from the admin panel" },
      { status: 400 },
    );
  }

  const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  if (result.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
