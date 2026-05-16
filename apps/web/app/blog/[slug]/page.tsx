import { db, posts, users, comments } from '@bloghub/db';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 3600; // ISR: revalidate every hour

async function getPost(slug: string) {
  try {
    const post = await db.query.posts.findFirst({
      where: eq(posts.slug, slug),
    });
    return post;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

async function getAuthor(authorId: string) {
  try {
    const author = await db.query.users.findFirst({
      where: eq(users.id, authorId),
    });
    return author;
  } catch (error) {
    console.error('Error fetching author:', error);
    return null;
  }
}

async function getComments(postId: string) {
  try {
    const postComments = await db.query.comments.findMany({
      where: eq(comments.postId, postId),
    });
    return postComments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function generateStaticParams() {
  try {
    const allPosts = await db.query.posts.findMany({
      where: eq(posts.published, true),
    });
    return allPosts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.published) {
    notFound();
  }

  const author = await getAuthor(post.authorId);
  const postComments = await getComments(post.id);

  return (
    <article className="max-w-3xl mx-auto">
      <Link href="/blog" className="text-blue-600 hover:text-blue-700 mb-8">
        ← Back to Blog
      </Link>

      <header className="mb-8 space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          {post.title}
        </h1>

        <div className="flex gap-4 items-center text-gray-600 dark:text-gray-400">
          {author && (
            <div className="flex items-center gap-2">
              {author.avatar && (
                <img
                  src={author.avatar}
                  alt={author.name}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <span>{author.name}</span>
            </div>
          )}
          <span>•</span>
          <time>
            {post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString()
              : new Date(post.createdAt).toLocaleDateString()}
          </time>
        </div>

        {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {post.tags.map((tag: any) => (
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

      {postComments.length > 0 && (
        <section className="border-t border-gray-200 dark:border-gray-800 pt-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            Comments ({postComments.length})
          </h2>

          <div className="space-y-4">
            {postComments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <p className="text-gray-800 dark:text-gray-200">
                  {comment.content}
                </p>
                <time className="text-sm text-gray-600 dark:text-gray-400 mt-2 block">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
