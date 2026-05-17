'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deletePostAction } from '../../actions/posts';

type Post = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export default function MyPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    const res = await fetch('/api/posts?mine=true&limit=100', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const j = await res.json();
      setPosts(j.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    // Web client → Next.js backend via a Server Action (no fetch).
    const result = await deletePostAction(id);
    if (result.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
    else alert(result.error);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">My Posts</h1>
        <Link
          href="/admin/posts/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          + New Post
        </Link>
      </div>

      {loading && <p className="text-gray-600 dark:text-gray-300">Loading…</p>}
      {!loading && posts.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400">
          You haven&apos;t written anything yet.
        </p>
      )}

      <ul className="space-y-3">
        {posts.map((p) => (
          <li
            key={p.id}
            className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-between"
          >
            <div>
              <Link
                href={`/blog/${p.slug}`}
                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600"
              >
                {p.title}
              </Link>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {p.published ? (
                  <span className="text-green-600">Published</span>
                ) : (
                  <span className="text-yellow-600">Draft</span>
                )}
                {' · '}
                {new Date(p.publishedAt ?? p.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/posts/${p.id}/edit`}
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit
              </Link>
              <button
                onClick={() => onDelete(p.id)}
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
