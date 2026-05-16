import { NextRequest, NextResponse } from 'next/server';
import { db, posts, comments, users } from '@bloghub/db';
import { commentSchema, requireAuth, getAuthPayload } from '@bloghub/api';
import { asc, eq, or } from 'drizzle-orm';

export const runtime = 'nodejs';

// GET /api/posts/:id/comments — list comments on a post.
// Public, but only for posts the caller is allowed to see (drafts are
// restricted to their author).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await db.query.posts.findFirst({
      where: or(eq(posts.id, id), eq(posts.slug, id)),
    });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (!post.published) {
      const auth = getAuthPayload(request);
      if (!auth || auth.sub !== post.authorId) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
    }

    const rows = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        postId: comments.postId,
        author: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.postId, post.id))
      .orderBy(asc(comments.createdAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('List comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/posts/:id/comments — auth required. Anyone logged in may comment
// on any post they are allowed to see (drafts → only the author).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const post = await db.query.posts.findFirst({
      where: or(eq(posts.id, id), eq(posts.slug, id)),
    });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (!post.published && post.authorId !== auth.payload.sub) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = commentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(comments)
      .values({
        postId: post.id,
        authorId: auth.payload.sub,
        content: validation.data.content,
      })
      .returning();

    const author = await db.query.users.findFirst({
      where: eq(users.id, auth.payload.sub),
      columns: { id: true, name: true, avatar: true },
    });

    return NextResponse.json(
      { success: true, data: { ...created, author } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
