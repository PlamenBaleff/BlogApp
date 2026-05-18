import { NextRequest, NextResponse } from 'next/server';
import { db, posts, users } from '@bloghub/db';
import { postSchema, requireAuth, getAuthPayload } from '@bloghub/api';
import { and, desc, eq, or, sql } from 'drizzle-orm';

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
    const mineParam = searchParams.get('mine') === 'true';

    const auth = getAuthPayload(request);

    // Visibility rules:
    // - Anonymous users only see published posts.
    // - Authenticated users see published posts AND their own drafts.
    // - `?mine=true` (auth required) returns only the caller's posts (drafts included).
    // - `?published=false` is honored only for the caller's own posts.
    let whereClause;
    if (mineParam) {
      if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      whereClause = eq(posts.authorId, auth.sub);
    } else if (!auth) {
      whereClause = eq(posts.published, true);
    } else if (onlyPublished) {
      whereClause = or(
        eq(posts.published, true),
        eq(posts.authorId, auth.sub)
      );
    } else {
      // authenticated + published=false → must scope to own posts
      whereClause = eq(posts.authorId, auth.sub);
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(whereClause);

    // Note: author.email is intentionally omitted from the public feed so
    // we don't leak addresses to anonymous scrapers.
    const rows = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(whereClause)
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

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

    const { title, slug, contentHtml, excerpt, coverImageUrl, tags, published } =
      validation.data;

    // Rely on the unique constraint on `slug` to handle the race window
    // between "check" and "insert". Postgres raises 23505 on conflict.
    let newPost;
    try {
      [newPost] = await db
        .insert(posts)
        .values({
          title,
          slug,
          contentHtml,
          excerpt: excerpt ?? null,
          coverImageUrl: coverImageUrl ?? null,
          authorId: auth.payload.sub,
          tags: tags ?? [],
          published: published ?? false,
          publishedAt: published ? new Date() : null,
        })
        .returning();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === '23505') {
        return NextResponse.json(
          { error: 'A post with this slug already exists' },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true, data: newPost }, { status: 201 });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
