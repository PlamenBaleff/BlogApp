import { db, posts } from '@bloghub/db';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';

export const revalidate = 3600; // ISR: revalidate every hour

async function getBlogPosts() {
  try {
    const blogPosts = await db.query.posts.findMany({
      where: eq(posts.published, true),
      orderBy: desc(posts.publishedAt),
    });
    return blogPosts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export default async function BlogPage() {
  const blogPosts = await getBlogPosts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Blog
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Latest articles and stories from our community
        </p>
      </div>

      {blogPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            No published posts yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {blogPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <article className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-600 dark:hover:border-blue-600 transition cursor-pointer">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                  {post.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {post.excerpt || post.contentHtml.substring(0, 200)}...
                </p>
                <div className="flex gap-2 items-center text-sm text-gray-500 dark:text-gray-500">
                  <span>
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString()
                      : new Date(post.createdAt).toLocaleDateString()}
                  </span>
                  {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="flex gap-2">
                      {post.tags.map((tag: any) => (
                        <span
                          key={tag}
                          className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
