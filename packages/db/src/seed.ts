import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db, users, posts, comments } from './index';

/**
 * Seed the database with realistic volumes so paging / indexing can be
 * validated against the scalability requirement (≥ 10 000 records in primary
 * tables). The script is idempotent: it wipes the existing data first.
 *
 *   - 1 admin user           (admin@example.com / Admin123!)
 *   - 1 demo user            (demo@example.com  / demo1234)   ← test credentials
 *   - 50 regular users       (user1@example.com … user50@example.com / Password123!)
 *   - 10 000 posts           (~90 % published, ~10 % drafts) spread over all users
 *   - 30 000 comments        attached to random published posts by random users
 *
 * Inserts are batched (1 000 rows / round-trip) to stay well under the
 * PostgreSQL bind-parameter limit and to keep the Neon HTTP driver happy.
 */

const DEMO_PASSWORD = 'demo1234';
const ADMIN_PASSWORD = 'Admin123!';
const USER_PASSWORD = 'Password123!';

const REGULAR_USER_COUNT = 50;
const POST_COUNT = 10_000;
const COMMENT_COUNT = 30_000;
const DRAFT_RATIO = 0.1;
const BATCH_SIZE = 1_000;

const SAMPLE_TAGS = [
  'nextjs', 'react', 'typescript', 'tailwind', 'expo', 'mobile', 'fullstack',
  'database', 'drizzle', 'postgres', 'neon', 'ai', 'agents', 'webdev', 'devops',
  'serverless', 'auth', 'jwt', 'performance', 'testing',
];

const TITLE_PREFIXES = [
  'Getting Started with', 'A Deep Dive into', 'Why You Should Try',
  'The Definitive Guide to', 'Lessons Learned from', 'Building Production-Ready',
  'Scaling', 'Debugging', 'Refactoring', '10 Tips for', 'Understanding',
  'Hands-On with', 'From Zero to Hero with', 'Patterns and Pitfalls of',
  'A Practical Tour of',
];

const TITLE_SUBJECTS = [
  'Next.js App Router', 'React Server Components', 'Drizzle ORM',
  'Neon Serverless Postgres', 'Expo Router', 'TypeScript Generics',
  'Tailwind v4', 'JWT Auth', 'AI Coding Agents', 'Monorepos with pnpm',
  'Edge Runtimes', 'Postgres Indexes', 'Server Actions', 'Mobile Auth Flows',
  'Streaming UIs',
];

function pick<T>(arr: T[], rand = Math.random()): T {
  return arr[Math.floor(rand * arr.length)];
}

function makeTitle(i: number): string {
  return `${pick(TITLE_PREFIXES)} ${pick(TITLE_SUBJECTS)} #${i}`;
}

function makeSlug(title: string, i: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${i}`;
}

function makeContent(title: string): string {
  return (
    `<h2>${title}</h2>` +
    `<p>This is a generated demo post used to validate paging and DB indexes ` +
    `under realistic load. It contains placeholder content only.</p>` +
    `<p>BlogHub is a full-stack blog application built with Next.js, React, ` +
    `Expo, Drizzle ORM and Neon Postgres. Refer to the README for the full ` +
    `architecture overview.</p>`
  );
}

function makeTags(): string[] {
  const n = 1 + Math.floor(Math.random() * 3);
  const out = new Set<string>();
  while (out.size < n) out.add(pick(SAMPLE_TAGS));
  return [...out];
}

function makeComment(): string {
  const opener = pick([
    'Great post!', 'Thanks for sharing.', 'Interesting take.',
    'I disagree on one point:', 'This helped me a lot.', 'Bookmarking this.',
    'Could you expand on the last section?', 'Nice write-up.',
  ]);
  return `${opener} Generated demo comment for load testing.`;
}

async function clearAll() {
  // CASCADE handles posts/comments/refresh_tokens via FKs.
  await db.execute(
    sql`TRUNCATE TABLE refresh_tokens, comments, posts, users RESTART IDENTITY CASCADE`
  );
}

async function insertInBatches<T>(
  rows: T[],
  insertBatch: (batch: T[]) => Promise<void>,
  label: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await insertBatch(batch);
    console.log(`  …${label} ${Math.min(i + batch.length, rows.length)}/${rows.length}`);
  }
}

async function seed() {
  console.log('🌱 Seeding database…');
  const t0 = Date.now();

  console.log('• Truncating existing data');
  await clearAll();

  // Hash passwords once (bcrypt is intentionally slow — don't repeat per user).
  console.log('• Hashing passwords');
  const [adminHash, demoHash, userHash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, 10),
    bcrypt.hash(DEMO_PASSWORD, 10),
    bcrypt.hash(USER_PASSWORD, 10),
  ]);

  console.log('• Inserting users');
  const userRows: Array<{
    email: string;
    name: string;
    passwordHash: string;
    role: string;
    avatar: string;
    bio: string;
  }> = [];

  userRows.push({
    email: 'admin@example.com',
    name: 'Site Admin',
    passwordHash: adminHash,
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    bio: 'BlogHub administrator.',
  });
  userRows.push({
    email: 'demo@example.com',
    name: 'Demo User',
    passwordHash: demoHash,
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    bio: 'Demo account used for evaluation. Password: demo1234',
  });
  for (let i = 1; i <= REGULAR_USER_COUNT; i++) {
    userRows.push({
      email: `user${i}@example.com`,
      name: `User ${i}`,
      passwordHash: userHash,
      role: 'user',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`,
      bio: `Sample author #${i}.`,
    });
  }

  const insertedUsers = await db
    .insert(users)
    .values(userRows)
    .returning({ id: users.id });
  console.log(`  ✓ ${insertedUsers.length} users inserted`);

  console.log(`• Building ${POST_COUNT.toLocaleString()} posts`);
  const now = Date.now();
  const postRows = Array.from({ length: POST_COUNT }, (_, i) => {
    const title = makeTitle(i + 1);
    const slug = makeSlug(title, i + 1);
    const isPublished = Math.random() >= DRAFT_RATIO;
    // Spread publishedAt across the last ~2 years so ORDER BY published_at
    // produces meaningful, varied pages.
    const ageMs = Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 730);
    const createdAt = new Date(now - ageMs);
    return {
      title,
      slug,
      contentHtml: makeContent(title),
      excerpt: `Demo excerpt for ${title}.`,
      authorId: insertedUsers[Math.floor(Math.random() * insertedUsers.length)].id,
      published: isPublished,
      tags: makeTags(),
      createdAt,
      updatedAt: createdAt,
      publishedAt: isPublished ? createdAt : null,
    };
  });

  await insertInBatches(
    postRows,
    async (batch) => {
      await db.insert(posts).values(batch);
    },
    'posts',
  );

  // Re-fetch a lightweight list of published post ids for comment targeting.
  console.log('• Resolving published post IDs for comments');
  const publishedPosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(sql`${posts.published} = true`);
  console.log(`  ✓ ${publishedPosts.length.toLocaleString()} published posts`);

  console.log(`• Building ${COMMENT_COUNT.toLocaleString()} comments`);
  const commentRows = Array.from({ length: COMMENT_COUNT }, () => {
    const ageMs = Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365);
    return {
      postId: publishedPosts[Math.floor(Math.random() * publishedPosts.length)].id,
      authorId: insertedUsers[Math.floor(Math.random() * insertedUsers.length)].id,
      content: makeComment(),
      createdAt: new Date(now - ageMs),
    };
  });

  await insertInBatches(
    commentRows,
    async (batch) => {
      await db.insert(comments).values(batch);
    },
    'comments',
  );

  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✨ Seed complete in ${seconds}s`);
  console.log('');
  console.log('Test credentials:');
  console.log('  admin → admin@example.com / Admin123!');
  console.log('  demo  → demo@example.com  / demo1234');
  console.log('  users → user1..user50@example.com / Password123!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
