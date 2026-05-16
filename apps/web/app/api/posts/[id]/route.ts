import { NextRequest, NextResponse } from 'next/server';
import { db, posts, comments, users } from '@bloghub/db';
import { postUpdateSchema, requireAuth, getAuthPayload } from '@bloghub/api';
import { eq, or } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await db.query.posts.findFirst({
      where: or(eq(posts.id, id), eq(posts.slug, id)),
      with: {
        author: {
          columns: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Drafts are only visible to their author.
    if (!post.published) {
      const auth = getAuthPayload(request);
      if (!auth || auth.sub !== post.authorId) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
    }

    const postComments = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        author: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.postId, post.id));

    return NextResponse.json({
      success: true,
      data: { ...post, comments: postComments },
    });
  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = postUpdateSchema.safeParse(body);
    if (!validation.success) {
      console.error('PATCH /api/posts validation failed', {
        body,
        details: validation.error.flatten(),
      });
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const post = await db.query.posts.findFirst({ where: eq(posts.id, id) });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post.authorId !== auth.payload.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const patch = validation.data;
    const willPublishNow = patch.published === true && !post.published;

    const [updated] = await db
      .update(posts)
      .set({
        ...patch,
        publishedAt: willPublishNow ? new Date() : post.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const post = await db.query.posts.findFirst({ where: eq(posts.id, id) });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    if (post.authorId !== auth.payload.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(posts).where(eq(posts.id, id));

    return NextResponse.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
