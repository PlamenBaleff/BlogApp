import { db, posts, users } from '@bloghub/db';
import { desc, eq, sql } from 'drizzle-orm';
import { PostCard, type PostCardData } from '../../components/PostCard';
import { Pagination } from '../../components/Pagination';

// Always render with fresh data — `published` posts in the DB change too
// often (and the dataset is too large) to pre-render at build time.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

async function getBlogPosts(page: number) {
  const safePage = Math.max(1, page);
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
    .where(eq(posts.published, true));
  const total = countRow?.count ?? 0;

  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      tags: posts.tags,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
      authorName: users.name,
      authorAvatar: users.avatar,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.published, true))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt))
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  const data: PostCardData[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    tags: r.tags ?? [],
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
    author: r.authorName ? { name: r.authorName, avatar: r.authorAvatar } : null,
  }));

  return {
    data,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
  };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? '1', 10) || 1;
  const { data, pages, total, page: safePage } = await getBlogPosts(page);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Blog</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Latest articles and stories from our community.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            No published posts yet. Check back soon!
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {data.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination page={safePage} pages={pages} total={total} />
        </>
      )}
    </div>
  );
}
