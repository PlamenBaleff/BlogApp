import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    bio: text('bio'),
    avatar: text('avatar'),
    // Application role. 'user' (regular) or 'admin'. Enforced server-side
    // (API routes + middleware). UI checks are convenience only.
    role: varchar('role', { length: 16 }).default('user').notNull(),
    // UI theme preference for the web app. 'light' (default) or 'dark'.
    // The mobile app may ignore this and follow the OS theme instead.
    theme: varchar('theme', { length: 8 }).default('light').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    roleIdx: index('users_role_idx').on(table.role),
    createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  })
);

export const posts = pgTable(
  'posts',
  {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    contentHtml: text('content_html').notNull(),
    excerpt: text('excerpt'),
    // Optional cover image, stored as the public URL returned by the
    // object-storage upload endpoint (Cloudflare R2). NULL when the post has
    // no cover image.
    coverImageUrl: text('cover_image_url'),
    authorId: varchar('author_id', { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    published: boolean('published').default(false).notNull(),
    tags: text('tags').array().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => ({
    // Speed up "list my posts" and joins from comments back to author.
    authorIdx: index('posts_author_id_idx').on(table.authorId),
    // Filtering by published status (public feed vs. drafts).
    publishedIdx: index('posts_published_idx').on(table.published),
    // Default public feed ordering: most recently published first.
    publishedAtIdx: index('posts_published_at_idx').on(table.publishedAt),
    // Fallback ordering / "my drafts" sorted by creation time.
    createdAtIdx: index('posts_created_at_idx').on(table.createdAt),
    // Composite index for the main public feed query:
    //   WHERE published = true ORDER BY published_at DESC
    // Lets Postgres satisfy both the filter and the ordering from a single
    // index scan, which is critical at the 10k+ row scale tested by seed.ts.
    publishedFeedIdx: index('posts_published_feed_idx').on(
      table.published,
      table.publishedAt,
    ),
    // Composite index for "my posts" (author drafts + published combined)
    // ordered by createdAt.
    authorCreatedIdx: index('posts_author_created_idx').on(
      table.authorId,
      table.createdAt,
    ),
  })
);

export const comments = pgTable(
  'comments',
  {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    postId: varchar('post_id', { length: 128 })
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: varchar('author_id', { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Fetching the comment thread for a post.
    postIdx: index('comments_post_id_idx').on(table.postId),
    // "Comments by user" / cascade lookups.
    authorIdx: index('comments_author_id_idx').on(table.authorId),
    // Chronological ordering within a thread.
    createdAtIdx: index('comments_created_at_idx').on(table.createdAt),
  })
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').unique().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  })
);

export type UserRole = 'user' | 'admin';

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  refreshTokens: many(refreshTokens),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
