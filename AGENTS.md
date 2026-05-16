# Neon MCP Database Access Rules

- Connect Neon MCP only to a database project named `BlogDB` in my Neon account.

# Database Migrations

- If you need to modify the database, follow the standard Drizzle workflow:
  change drizzle schema file --> generate migration --> migrate to Neon DB.
- Migration SQL files must be kept in the repo (under `packages/db/drizzle/`)
  and committed alongside the schema change. Never apply ad-hoc DDL directly
  to Neon; everything goes through Drizzle.

# Authorization Policy (application-level RLS)

- Anonymous (not logged in): can read all published posts and their comments.
  No write access of any kind.
- Authenticated user: can read published posts, post comments on any post,
  and create their own posts.
- Authenticated user can only edit or delete posts they authored. Same rule
  applies to their own comments.
- Drafts (`published = false`) are only visible to their author.
- Enforce these rules in the API route handlers (Node.js runtime) using the
  JWT `sub` claim — UI checks are convenience only.
