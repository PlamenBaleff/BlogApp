<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BlogHub web app

Next.js 16 App Router web client. Talks to the same Route Handlers it ships
with (`app/api/**`). Tailwind v4 for styling, JWT auth via the shared
`@bloghub/api` package, Drizzle ORM via `@bloghub/db`.

## Runtime conventions

- Every Route Handler under `app/api/**` MUST export
  `export const runtime = 'nodejs'`. Drizzle + `bcryptjs` + `jsonwebtoken`
  cannot run on the Edge runtime.
- Database access happens only on the server. Never import `@bloghub/db`
  from a `'use client'` file.
- API responses follow `{ success: true, data }` for success and
  `{ error: string, details? }` for errors. Keep this shape so the mobile
  client and existing web screens keep working.

## Auth + authorization

- Access tokens are short-lived JWTs containing `{ sub, email, role }`.
  Refresh tokens are random opaque strings stored as bcrypt hashes in
  `refresh_tokens`.
- Client-side session state lives in `localStorage` (`accessToken`,
  `refreshToken`, `user`) plus a `accessToken` cookie so middleware can guard
  `/admin/**`. Always go through `app/lib/session.ts`:
  `getSession`, `getAccessToken`, `authHeader`, `saveSession`, `clearSession`.
- Server-side guards live in `@bloghub/api`:
  - `requireAuth(request)` for any authenticated endpoint.
  - `requireAdmin(request)` for admin-only endpoints. UI role checks are a
    convenience only — every admin endpoint MUST call `requireAdmin`.
- Ownership rule for write endpoints on posts/comments: compare
  `payload.sub` to the row's `authorId` and 403 on mismatch (unless the
  caller is an admin, where applicable).

## Pages

The app currently ships these screens (>= 10 required by the rubric):

1. `/` — home / landing
2. `/blog` — paginated public feed (12/page, server-rendered)
3. `/blog/[slug]` — post detail + comments
4. `/about` — about page with demo credentials
5. `/auth/login`
6. `/auth/register`
7. `/profile` — view + edit own profile
8. `/admin/posts` — own posts list
9. `/admin/posts/new` — create post
10. `/admin/posts/[id]/edit` — edit post
11. `/admin/users` — admin-only user management

## Reusable UI

Located under `components/`. Prefer reusing these instead of re-styling
inputs/buttons inline:

- `Button` — variants `primary | secondary | danger | ghost`, sizes
  `sm | md | lg`.
- `Input`, `Textarea` — both support `label`, `hint`, `error`.
- `Alert` — variants `error | success | info | warning`.
- `AuthCard` — centered card layout for login/register/etc.
- `PostCard` — public blog feed card. Takes a `PostCardData` shape.
- `Pagination` — client component, preserves existing query params via
  `usePathname` + `useSearchParams`.

## Data fetching

- For server components prefer the typed Drizzle query builder
  (`db.select(...).from(...).where(...)`) so columns are explicit and we
  don't accidentally over-fetch large jsonb/text columns on list pages.
- Always paginate any list query touching `posts`, `comments`, or `users`.
  The dataset is seeded to ~10 k posts / ~30 k comments specifically to
  catch regressions.
- The public blog feed must order by `(publishedAt desc, createdAt desc)`
  and filter `published = true` to hit the partial indexes in the schema.

## Commands

```pwsh
pnpm --filter web dev              # local dev server
pnpm --filter web build            # production build
pnpm --filter web lint
pnpm --filter @bloghub/db generate # after editing schema.ts
pnpm --filter @bloghub/db migrate  # apply migrations to Neon
pnpm --filter @bloghub/db seed     # reseed (truncates tables!)
```

Never run ad-hoc DDL against Neon — all schema changes go through
`packages/db/src/schema.ts` + `drizzle/*.sql` per the root `AGENTS.md`.