import { NextRequest, NextResponse } from 'next/server';
import { db, posts, users } from '@bloghub/db';
import { postSchema, requireAuth } from '@bloghub/api';
import { desc, eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '10', 10))
    );
    const onlyPublished = searchParams.get('published') !== 'false';

    const offset = (page - 1) * limit;
    const whereClause = onlyPublished ? eq(posts.published, true) : undefined;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(whereClause ?? sql`true`);

    const rows = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(whereClause ?? sql`true`)
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((r: (typeof rows)[number]) => ({ ...r.post, author: r.author }));
    const total = countRow?.count ?? 0;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = postSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { title, slug, contentHtml, excerpt, tags, published } = validation.data;

    const existing = await db.query.posts.findFirst({
      where: eq(posts.slug, slug),
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 409 }
      );
    }

    const [newPost] = await db
      .insert(posts)
      .values({
        title,
        slug,
        contentHtml,
        excerpt: excerpt ?? null,
        authorId: auth.payload.sub,
        tags: tags ?? [],
        published: published ?? false,
        publishedAt: published ? new Date() : null,
      })
      .returning();

    return NextResponse.json({ success: true, data: newPost }, { status: 201 });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
