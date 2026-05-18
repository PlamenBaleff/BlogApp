'use server';

/**
 * Server Actions for blog posts.
 *
 * Per the capstone architecture brief, the Next.js web client talks to the
 * Next.js backend via **Server Actions** (no HTTP round-trip). The REST API
 * under `/api/posts` is retained for the Expo mobile client and remains the
 * source of truth for validation/authorization rules — these actions apply
 * the exact same checks server-side.
 *
 * Authorization model (see AGENTS.md):
 *   - Authenticated users may create posts.
 *   - Only the post's author may update or delete it.
 *   - The caller's identity is the JWT stored in the `accessToken` cookie
 *     (set by `saveSession` on login). UI checks are convenience only.
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db, posts } from '@bloghub/db';
import {
  verifyAccessToken,
  postSchema,
  postUpdateSchema,
  type PostInput,
  type PostUpdateInput,
} from '@bloghub/api';
import { deleteFromR2ByUrl } from '../lib/r2';

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

export async function createPostAction(
  input: PostInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: 'Unauthorized' };

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Invalid input',
      details: parsed.error.flatten(),
    };
  }

  const { title, slug, contentHtml, excerpt, coverImageUrl, tags, published } =
    parsed.data;

  let created;
  try {
    [created] = await db
      .insert(posts)
      .values({
        title,
        slug,
        contentHtml,
        excerpt: excerpt ?? null,
        coverImageUrl: coverImageUrl ?? null,
        authorId: userId,
        tags: tags ?? [],
        published: published ?? false,
        publishedAt: published ? new Date() : null,
      })
      .returning({ id: posts.id, slug: posts.slug });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === '23505') {
      return { ok: false, error: 'A post with this slug already exists' };
    }
    throw err;
  }

  // Invalidate any cached blog feeds / detail pages so the new post shows up.
  revalidatePath('/blog');
  revalidatePath('/admin/posts');
  if (created) revalidatePath(`/blog/${created.slug}`);

  return { ok: true, data: created };
}

export async function updatePostAction(
  id: string,
  patch: PostUpdateInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: 'Unauthorized' };

  const parsed = postUpdateSchema.safeParse(patch);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Invalid input',
      details: parsed.error.flatten(),
    };
  }

  const post = await db.query.posts.findFirst({ where: eq(posts.id, id) });
  if (!post) return { ok: false, error: 'Post not found' };
  if (post.authorId !== userId) return { ok: false, error: 'Forbidden' };

  const data = parsed.data;
  const willPublishNow = data.published === true && !post.published;

  // If the cover image is being replaced or cleared, schedule the old
  // object for deletion from R2 once the DB update succeeds.
  const coverChanged =
    Object.prototype.hasOwnProperty.call(data, 'coverImageUrl') &&
    data.coverImageUrl !== post.coverImageUrl;
  const previousCover = post.coverImageUrl;

  let updated;
  try {
    [updated] = await db
      .update(posts)
      .set({
        ...data,
        publishedAt: willPublishNow ? new Date() : post.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning({ id: posts.id, slug: posts.slug });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === '23505') {
      return { ok: false, error: 'A post with this slug already exists' };
    }
    throw err;
  }

  if (coverChanged && previousCover) {
    // Fire-and-forget; failures are logged inside deleteFromR2ByUrl.
    void deleteFromR2ByUrl(previousCover);
  }

  revalidatePath('/blog');
  revalidatePath('/admin/posts');
  if (post.slug) revalidatePath(`/blog/${post.slug}`);
  if (updated && updated.slug !== post.slug) {
    revalidatePath(`/blog/${updated.slug}`);
  }

  return { ok: true, data: updated };
}

export async function deletePostAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: 'Unauthorized' };

  const post = await db.query.posts.findFirst({ where: eq(posts.id, id) });
  if (!post) return { ok: false, error: 'Post not found' };
  if (post.authorId !== userId) return { ok: false, error: 'Forbidden' };

  await db.delete(posts).where(eq(posts.id, id));

  // Best-effort cleanup of the associated cover image in R2.
  if (post.coverImageUrl) {
    void deleteFromR2ByUrl(post.coverImageUrl);
  }

  revalidatePath('/blog');
  revalidatePath('/admin/posts');
  if (post.slug) revalidatePath(`/blog/${post.slug}`);

  return { ok: true, data: { id } };
}
