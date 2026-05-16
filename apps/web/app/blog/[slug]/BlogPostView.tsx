'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Author = { id: string; name: string; avatar?: string | null };

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author?: Author | null;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  excerpt: string | null;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  published: boolean;
  authorId: string;
  author?: Author | null;
};

type Me = { id: string; email: string; name: string } | null;

export function BlogPostView({ slug }: { slug: string }) {
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const userJson = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userJson) {
      try {
        setMe(JSON.parse(userJson));
      } catch {
        setMe(null);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token =
          typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const [pRes, cRes] = await Promise.all([
          fetch(`/api/posts/${slug}`, { headers, cache: 'no-store' }),
          fetch(`/api/posts/${slug}/comments`, { headers, cache: 'no-store' }),
        ]);

        if (!pRes.ok) {
          if (cancelled) return;
          setError(pRes.status === 404 ? 'Post not found' : 'Failed to load post');
          return;
        }

        const pJson = await pRes.json();
        const cJson = cRes.ok ? await cRes.json() : { data: [] };
        if (cancelled) return;
        setPost(pJson.data);
        setComments(cJson.data ?? []);
      } catch {
        if (!cancelled) setError('Failed to load post');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;
    setPosting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || 'Failed to post comment');
        return;
      }
      const j = await res.json();
      setComments((prev) => [...prev, j.data]);
      setNewComment('');
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || 'Failed to delete comment');
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const deletePost = async () => {
    if (!post) return;
    if (!confirm('Delete this post permanently?')) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || 'Failed to delete post');
        return;
      }
      router.push('/blog');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600 dark:text-gray-300">Loading…</div>;
  }
  if (error || !post) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">404</h1>
        <p className="text-gray-600 dark:text-gray-400">{error ?? 'Post not found'}</p>
        <Link href="/blog" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  const isOwner = me?.id === post.authorId;

  return (
    <article className="max-w-3xl mx-auto">
      <Link href="/blog" className="text-blue-600 hover:text-blue-700 mb-8 inline-block">
        ← Back to Blog
      </Link>

      <header className="mb-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {post.title}
          </h1>
          {isOwner && (
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/admin/posts/${post.id}/edit`}
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit
              </Link>
              <button
                onClick={deletePost}
                disabled={deleting}
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-4 items-center text-gray-600 dark:text-gray-400">
          {post.author && (
            <div className="flex items-center gap-2">
              {post.author.avatar && (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <span>{post.author.name}</span>
            </div>
          )}
          <span>•</span>
          <time>
            {post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString()
              : new Date(post.createdAt).toLocaleDateString()}
          </time>
          {!post.published && (
            <span className="ml-2 px-2 py-0.5 rounded bg-yellow-200 text-yellow-900 text-xs font-semibold">
              DRAFT
            </span>
          )}
        </div>

        {post.tags?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="prose dark:prose-invert max-w-none mb-12">
        <div
          className="text-gray-800 dark:text-gray-200"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </div>

      <section className="border-t border-gray-200 dark:border-gray-800 pt-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Comments ({comments.length})
        </h2>

        {me ? (
          <form onSubmit={submitComment} className="mb-8 space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              required
              placeholder="Write a comment…"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={posting || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
            >
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        ) : (
          <div className="mb-8 p-4 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Log in
            </Link>{' '}
            to leave a comment.
          </div>
        )}

        <div className="space-y-4">
          {comments.length === 0 && (
            <p className="text-gray-600 dark:text-gray-400">No comments yet.</p>
          )}
          {comments.map((comment) => {
            const canDelete = me?.id && comment.author?.id === me.id;
            return (
              <div
                key={comment.id}
                className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {comment.author?.name ?? 'Unknown'}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {comment.content}
                </p>
                <time className="text-xs text-gray-600 dark:text-gray-400 mt-2 block">
                  {new Date(comment.createdAt).toLocaleString()}
                </time>
              </div>
            );
          })}
        </div>
      </section>
    </article>
  );
}
