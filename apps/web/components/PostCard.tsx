import Link from 'next/link';

export interface PostCardData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml?: string;
  tags: string[];
  publishedAt: string | Date | null;
  createdAt: string | Date;
  author?: { name: string; avatar?: string | null } | null;
}

// Use a stable ISO-derived YYYY-MM-DD format. Locale-dependent formatters
// (`toLocaleDateString` without an explicit locale) produce different output
// on the server vs. the user's browser and cause a hydration mismatch.
function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function PostCard({ post }: { post: PostCardData }) {
  const summary =
    post.excerpt ??
    (post.contentHtml
      ? post.contentHtml.replace(/<[^>]+>/g, ' ').slice(0, 180) + '…'
      : '');

  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <article className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-600 dark:hover:border-blue-500 transition">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-blue-600">
          {post.title}
        </h2>
        {summary && (
          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{summary}</p>
        )}
        <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500">
          {post.author?.name && <span>{post.author.name}</span>}
          {post.author?.name && <span aria-hidden>·</span>}
          <time>{formatDate(post.publishedAt ?? post.createdAt)}</time>
          {post.tags?.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="flex flex-wrap gap-1">
                {post.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </span>
            </>
          )}
        </div>
      </article>
    </Link>
  );
}
