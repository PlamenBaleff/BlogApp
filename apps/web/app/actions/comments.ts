'use server';

/**
 * Server Actions for blog comments. See `./posts.ts` for the rationale —
 * the web client speaks Server Actions, the mobile client speaks REST.
 *
 * Authorization (mirrors `/api/comments` + `/api/posts/[id]/comments`):
 *   - Any authenticated user may comment on a post they are allowed to see.
 *   - Drafts (`published = false`) are only visible to their author.
 *   - Only the comment's author may delete it.
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq, or } from 'drizzle-orm';

import { db, comments, posts, users } from '@bloghub/db';
import { verifyAccessToken, commentSchema } from '@bloghub/api';

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: unknown };

async function getCurrentUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get('accessToken')?.value;
  if (!token) return null;
  const payload = verifyAccessToken(token);
  return payload?.sub ?? null;
}

export interface CreatedComment {
  id: string;
  content: string;
  createdAt: Date;
  postId: string;
  author: { id: string; name: string; avatar: string | null } | null;
}

export async function createCommentAction(
  postIdOrSlug: string,
  content: string,
): Promise<ActionResult<CreatedComment>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: 'Unauthorized' };

  const parsed = commentSchema.safeParse({ content });
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Invalid input',
      details: parsed.error.flatten(),
    };
  }

  const post = await db.query.posts.findFirst({
    where: or(eq(posts.id, postIdOrSlug), eq(posts.slug, postIdOrSlug)),
  });
  if (!post) return { ok: false, error: 'Post not found' };
  if (!post.published && post.authorId !== userId) {
    return { ok: false, error: 'Post not found' };
  }

  const [created] = await db
    .insert(comments)
    .values({
      postId: post.id,
      authorId: userId,
      content: parsed.data.content,
    })
    .returning();

  const author = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, avatar: true },
  });

  revalidatePath(`/blog/${post.slug}`);

  return {
    ok: true,
    data: { ...created, author: author ?? null },
  };
}

export async function deleteCommentAction(
  commentId: string,
): Promise<ActionResult<{ id: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: 'Unauthorized' };

  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  });
  if (!comment) return { ok: false, error: 'Comment not found' };
  if (comment.authorId !== userId) return { ok: false, error: 'Forbidden' };

  await db.delete(comments).where(eq(comments.id, commentId));

  // We don't know the slug cheaply here without an extra query; the
  // BlogPostView refreshes locally after a successful action.
  return { ok: true, data: { id: commentId } };
}
