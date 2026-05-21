import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@bloghub/api';
import { db, users, posts, comments } from '@bloghub/db';
import { desc, eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
// This route depends on the request (auth header, query params) and must NOT
// be evaluated at build time. Without this, Next.js tries to "collect page
// data" during `next build`, which fails on Netlify because there is no real
// request/JWT during the build phase.
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users  (admin only)
 *
 * Paged listing of all users, with their post + comment counts. This is
 * the data source for the admin dashboard.
 *
 * Query params:
 *   - page  (default 1, min 1)
 *   - limit (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if ('error' in auth) {
    const status = auth.error === 'unauthorized' ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10)),
    );

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatar: users.avatar,
        createdAt: users.createdAt,
        postCount: sql<number>`(SELECT count(*)::int FROM ${posts} WHERE ${posts.authorId} = ${users.id})`,
        commentCount: sql<number>`(SELECT count(*)::int FROM ${comments} WHERE ${comments.authorId} = ${users.id})`,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const total = countRow?.count ?? 0;

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
