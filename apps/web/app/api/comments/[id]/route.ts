import { NextRequest, NextResponse } from 'next/server';
import { db, comments } from '@bloghub/db';
import { requireAuth } from '@bloghub/api';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

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
    if (comment.authorId !== auth.payload.sub) {
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
