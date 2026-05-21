import { NextRequest, NextResponse } from 'next/server';
import { db, comments, users } from '@bloghub/db';
import { commentSchema, requireAuth } from '@bloghub/api';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH /api/comments/:id — only the comment's author may edit it.
// Per AGENTS.md: "Same rule applies to their own comments" (edit + delete).
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

    const body = await request.json().catch(() => ({}));
    const validation = commentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id),
    });
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (comment.authorId !== auth.payload.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [updated] = await db
      .update(comments)
      .set({ content: validation.data.content })
      .where(eq(comments.id, id))
      .returning();

    const author = await db.query.users.findFirst({
      where: eq(users.id, auth.payload.sub),
      columns: { id: true, name: true, avatar: true },
    });

    return NextResponse.json({
      success: true,
      data: { ...updated, author: author ?? null },
    });
  } catch (error) {
    console.error('Update comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/comments/:id — only the comment's author may delete it.
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

    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id),
    });
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (comment.authorId !== auth.payload.sub && auth.payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(comments).where(eq(comments.id, id));

    return NextResponse.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
