'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { slugify } from '../../../../lib/slugify';
import { updatePostAction } from '../../../../actions/posts';

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    contentHtml: '',
    tags: '',
    published: false,
  });

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.replace('/auth/login');
        return;
      }
      const userJson = localStorage.getItem('user');
      const me = userJson ? JSON.parse(userJson) : null;

      const res = await fetch(`/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        setError('Post not found');
        setLoading(false);
        return;
      }
      const { data } = await res.json();
      if (me?.id !== data.authorId) {
        setError('You can only edit your own posts');
        setLoading(false);
        return;
      }
      setAuthorId(data.authorId);
      setForm({
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt ?? '',
        contentHtml: data.contentHtml,
        tags: (data.tags ?? []).join(', '),
        published: !!data.published,
      });
      setLoading(false);
    })();
  }, [id, router]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Web client → Next.js backend via a Server Action (no fetch).
      const result = await updatePostAction(id, {
        title: form.title,
        slug: slugify(form.slug),
        excerpt: form.excerpt || undefined,
        contentHtml: form.contentHtml,
        tags,
        published: form.published,
      });

      if (!result.ok) {
        console.error('updatePostAction failed', result);
        const details =
          result.details && typeof result.details === 'object'
            ? ` (${JSON.stringify(
                (result.details as { fieldErrors?: unknown }).fieldErrors ??
                  result.details,
              )})`
            : '';
        setError((result.error || 'Failed to save') + details);
        return;
      }

      router.push(`/blog/${result.data.slug}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-600 dark:text-gray-300">Loading…</p>;
  if (error && !authorId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/blog" className="text-blue-600 hover:underline">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/admin/posts" className="text-blue-600 hover:text-blue-700 mb-6 inline-block">
        ← Back to My Posts
      </Link>
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Edit Post</h1>
      {error && (
        <div className="bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={onChange}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Slug
          </label>
          <input
            type="text"
            name="slug"
            value={form.slug}
            onChange={onChange}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Excerpt
          </label>
          <input
            type="text"
            name="excerpt"
            value={form.excerpt}
            onChange={onChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content (HTML)
          </label>
          <textarea
            name="contentHtml"
            value={form.contentHtml}
            onChange={onChange}
            rows={12}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags (comma separated)
          </label>
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={onChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            name="published"
            checked={form.published}
            onChange={onChange}
          />
          Published
        </label>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
