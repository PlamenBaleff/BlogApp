import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@bloghub/api';
import { db, users } from '@bloghub/db';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
});

async function countAdmins(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, 'admin'));
  return row?.count ?? 0;
}

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
  try {
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

    // Prevent demoting the LAST admin (regardless of who triggers it).
    if (parsed.data.role === 'user') {
      const target = await db.query.users.findFirst({ where: eq(users.id, id) });
      if (target?.role === 'admin' && (await countAdmins()) <= 1) {
        return NextResponse.json(
          { error: "Can't demote the last remaining admin" },
          { status: 400 },
        );
      }
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
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
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
  try {
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

    // Prevent deleting the last admin.
    const target = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (target?.role === 'admin' && (await countAdmins()) <= 1) {
      return NextResponse.json(
        { error: "Can't delete the last remaining admin" },
        { status: 400 },
      );
    }

    const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
