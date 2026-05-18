# BlogHub — Full-Stack Blog Application

A modern, full-stack blog platform built with **Next.js 16**, **React 19**, **Expo 55**, **Drizzle ORM**, and **Neon PostgreSQL**. This monorepo hosts a Web app (Next.js + Server Actions), a mobile client (React Native + Expo, consuming the REST API), and a shared backend.

> SoftUni AI — *Full-Stack Apps with AI* capstone project.

## 🌐 Live URLs & Demo Credentials

> _Will be filled in once deployment is finalised._

| Target            | URL                  |
| ----------------- | -------------------- |
| Web (Next.js)     | `https://…`          |
| Mobile (Expo web) | `https://…`          |

| Role  | Email                | Password       |
| ----- | -------------------- | -------------- |
| admin | `admin@example.com`  | `Admin123!`    |
| user  | `demo@example.com`   | `demo1234`     |

> The seed script (see below) creates 50 additional regular users (`user1@example.com` … `user50@example.com`) with the password `Password123!`, plus ~10 000 posts and ~30 000 comments so paging and indexes can be exercised under realistic load.

## 🏗️ Architecture

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  Web client (Next.js)    │        │  Mobile client (Expo)    │
│  React 19 + Tailwind 4   │        │  React Native 0.83       │
│                          │        │  Expo Router             │
│  Server Components +     │        │                          │
│  Server Actions (RSC)    │        │  Fetches REST API +      │
│                          │        │  SecureStore for tokens  │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │  Server Actions                   │  HTTPS + JWT
             │  (in-process)                     │  (REST)
             ▼                                   ▼
        ┌──────────────────────────────────────────────┐
        │      Next.js Route Handlers (REST API)       │
        │      /api/auth, /api/posts, /api/admin, …    │
        │      JWT verify + role-based authorization   │
        └────────────────────────┬─────────────────────┘
                                 │ Drizzle ORM
                                 ▼
                  ┌────────────────────────────┐
                  │  Neon Serverless Postgres  │
                  │  users · posts · comments  │
                  │  · refresh_tokens          │
                  └────────────────────────────┘
```

- **Web ↔ Backend:** React Server Components fetch data directly through the Drizzle layer; mutations go through **Next.js Server Actions** in `apps/web/app/actions/` (posts, comments).
- **Mobile ↔ Backend:** The Expo app uses `fetch` against the same Next.js project deployed as the REST API. Access tokens are stored with `expo-secure-store`.
- **Auth:** JWT access token (24h) + refresh token (30d, persisted as DB row). The `/api/auth/refresh` endpoint rotates the pair.
- **Authorization:** A small auth middleware (`packages/api/src/auth/middleware.ts`) decodes the JWT and exposes the user payload to route handlers; role checks (`role === 'admin'`) guard `/api/admin/*` and the admin pages under `/admin`.
- **Monorepo orchestration:** `pnpm` workspaces + Turbo. Shared code lives in `packages/`.

### Technologies

| Layer      | Tech                                                                           |
| ---------- | ------------------------------------------------------------------------------ |
| Web        | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4      |
| Mobile     | Expo 55, React Native 0.83, Expo Router, expo-secure-store                     |
| Backend    | Next.js Route Handlers, Server Actions, Zod validation                         |
| Database   | Neon serverless PostgreSQL + Drizzle ORM + drizzle-kit migrations              |
| Auth       | `jsonwebtoken`, `bcryptjs`                                                     |
| Tooling    | pnpm 9 workspaces, Turbo, ESLint, Prettier                                     |

## 📋 Project Structure

```
bloghub/
├── apps/
│   ├── web/                       # Next.js web application (App Router)
│   │   ├── app/
│   │   │   ├── api/               # REST API route handlers
│   │   │   │   ├── auth/          # register, login, logout, me, refresh
│   │   │   │   ├── posts/         # posts CRUD + comments sub-resource
│   │   │   │   ├── comments/[id]/ # comment edit/delete
│   │   │   │   └── admin/users/   # admin user management
│   │   │   ├── actions/           # Server Actions (posts, comments)
│   │   │   ├── admin/             # Admin panel pages (posts, users)
│   │   │   ├── auth/              # Login / Register pages
│   │   │   ├── blog/              # Public blog listing + [slug] detail
│   │   │   ├── profile/           # Authenticated user profile
│   │   │   ├── about/             # Static about page
│   │   │   ├── lib/               # session helpers, slug utilities
│   │   │   ├── layout.tsx         # Root layout + NavBar
│   │   │   └── page.tsx           # Landing page
│   │   ├── components/            # Reusable UI (Button, Input, Alert, …)
│   │   ├── middleware.ts          # Route protection middleware
│   │   └── next.config.ts
│   │
│   └── mobile/                    # Expo app (React Native)
│       ├── app/
│       │   ├── _layout.tsx        # Expo Router root
│       │   ├── index.tsx          # Splash / entry
│       │   ├── (auth)/            # login, register screens
│       │   └── (blog)/            # blog list, detail, edit screens
│       ├── components/            # Themed UI primitives
│       ├── lib/secureStorage.ts   # expo-secure-store wrapper
│       └── app.json
│
├── packages/
│   ├── db/                        # Drizzle ORM + Neon client
│   │   ├── src/
│   │   │   ├── schema.ts          # users, posts, comments, refresh_tokens
│   │   │   ├── index.ts           # Drizzle client
│   │   │   ├── migrate.ts         # Migration runner
│   │   │   └── seed.ts            # Seed (10k posts + 30k comments)
│   │   ├── drizzle/               # Generated SQL migrations (committed)
│   │   └── drizzle.config.ts
│   │
│   ├── api/                       # Shared backend utilities
│   │   └── src/auth/              # hash, jwt, middleware, zod schemas
│   │
│   └── types/                     # Shared TypeScript types
│       └── src/                   # api.ts, auth.ts, blog.ts
│
├── AGENTS.md                      # Instructions for AI dev agents
├── pnpm-workspace.yaml            # pnpm workspace config
├── turbo.json                     # Turbo monorepo config
└── package.json                   # Root scripts
```

## 🚀 Quick Start

### 1. **Prerequisites**

- Node.js 20+
- pnpm 9.0+ (installed globally: `npm install -g pnpm`)
- A free Neon PostgreSQL account (or any PostgreSQL 15+ instance)

### 2. **Clone the repository**

```bash
git clone https://github.com/PlamenBaleff/BlogApp.git
cd BlogApp
```

### 3. **Setup Environment Variables**

Create `.env.local` in the project root and add your Neon PostgreSQL connection string:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=postgresql://user:password@region.neon.tech/database?sslmode=require
JWT_SECRET=your-random-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. **Install Dependencies**

```bash
pnpm install
```

### 5. **Create Neon PostgreSQL Database**

1. Go to [neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy the connection string (with password)
4. Paste into `.env.local` as `DATABASE_URL`

### 6. **Run Migrations & Seed**

Initialize the database schema:

```bash
pnpm db:generate   # Generate migration files
pnpm db:migrate    # Apply migrations to database
pnpm db:seed       # (Optional) Add sample data
```

After running the seed you will have these accounts:

| Email                                  | Password       | Role  |
| -------------------------------------- | -------------- | ----- |
| `admin@example.com`                    | `Admin123!`    | admin |
| `demo@example.com`                     | `demo1234`     | user  |
| `user1@example.com` … `user50@example.com` | `Password123!` | user  |

The seed also creates ~10 000 posts (≈90% published) and ~30 000 comments so you can exercise paging, indexes and the blog feed under realistic load.

## 🗄️ Database schema (ERD)

```mermaid
erDiagram
    USERS ||--o{ POSTS         : authors
    USERS ||--o{ COMMENTS      : writes
    USERS ||--o{ REFRESH_TOKENS : owns
    POSTS ||--o{ COMMENTS      : has

    USERS {
        varchar id PK
        varchar email UK
        varchar passwordHash
        varchar name
        varchar role
        text    bio
        varchar avatar
        timestamp createdAt
        timestamp updatedAt
    }
    POSTS {
        varchar id PK
        varchar authorId FK
        varchar slug UK
        varchar title
        text    contentHtml
        text    excerpt
        jsonb   tags
        boolean published
        timestamp publishedAt
        timestamp createdAt
        timestamp updatedAt
    }
    COMMENTS {
        varchar id PK
        varchar postId FK
        varchar authorId FK
        text    body
        timestamp createdAt
        timestamp updatedAt
    }
    REFRESH_TOKENS {
        varchar id PK
        varchar userId FK
        varchar tokenHash UK
        timestamp expiresAt
        timestamp createdAt
    }
```

Indexes are added on every foreign key plus the columns used by the public blog
feed (`posts.published`, `posts.publishedAt`) so paged queries stay fast even on
the seeded ~10 000-row dataset.

### 7. **Start Development Servers**

Run all development servers in parallel:

```bash
pnpm dev
```

This starts:
- **Web**: `http://localhost:3000`
- **Mobile**: Expo at `http://localhost:8081` (follow CLI instructions)

## 📱 Features

### Web Application (Next.js) — 11 screens

| Screen                          | Path                          | Notes                                      |
| ------------------------------- | ----------------------------- | ------------------------------------------ |
| Landing                         | `/`                           | Hero + latest posts preview                |
| About                           | `/about`                      | Static page                                |
| Blog listing                    | `/blog`                       | Server-side paging (20 / page)             |
| Blog detail                     | `/blog/[slug]`                | Post body + comments + add-comment form    |
| Login                           | `/auth/login`                 | Sets HTTP-only session cookie              |
| Register                        | `/auth/register`              | Zod-validated form                         |
| Profile                         | `/profile`                    | Edit own name / bio (PATCH `/api/auth/me`) |
| My posts (admin / author)       | `/admin/posts`                | Owner list with quick actions              |
| New post                        | `/admin/posts/new`            | Rich editor + Server Action submit         |
| Edit post                       | `/admin/posts/[id]/edit`      | Updates via Server Action                  |
| Admin — users management        | `/admin/users`                | Admin only: promote/demote/delete users    |

Other UX building blocks: reusable `Button`, `Input`, `Alert`, `Pagination`, `PostCard`, `AuthCard`, `NavBar`. Responsive across desktop and mobile breakpoints; dark mode via Tailwind.

### Mobile Application (Expo) — 6 screens

| Screen        | Path                  | Notes                                         |
| ------------- | --------------------- | --------------------------------------------- |
| Splash / Home | `app/index.tsx`       | Auth gate                                     |
| Login         | `(auth)/login`        | Tokens stored via `expo-secure-store`         |
| Register      | `(auth)/register`     |                                               |
| Blog list    | `(blog)/index`         | `FlatList` + pull-to-refresh, paged           |
| Blog detail   | `(blog)/[slug]`       | Read post + comments                          |
| Edit post     | `(blog)/edit/[id]`    | Author/admin edit flow                        |

Tablet / phone layouts adapt via flex + responsive paddings. The admin panel is intentionally Web-only.

### Backend

- **REST API** under `apps/web/app/api/` — used by the mobile app
- **Server Actions** under `apps/web/app/actions/` — used by the Web app (`createPostAction`, `updatePostAction`, `deletePostAction`, `createCommentAction`, `deleteCommentAction`)
- **Drizzle ORM** for all DB access (no raw SQL on the hot path)
- **Zod** validation at every entry point (`packages/api/src/auth/validation.ts`)
- **bcryptjs** password hashing (10 rounds)
- **JWT** access + refresh tokens (`packages/api/src/auth/jwt.ts`)

## 🗄️ Database Schema

Four tables, all related (see ERD above):

| Table            | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| `users`          | Accounts with `role` (`user` \| `admin`), bio, avatar        |
| `posts`          | Articles with slug, HTML body, tags (JSONB), publish flag    |
| `comments`       | Comments belonging to a post + author (cascade on delete)    |
| `refresh_tokens` | Refresh-token records for rotation / revocation              |

### Indexes & Scalability

- Primary-key + foreign-key indexes on every relationship
- `posts(published, published_at)` composite index → powers the public feed
- `posts(author_id, created_at)` composite index → powers "my posts"
- Seed inserts ~10 000 posts and ~30 000 comments (batched, 1 000 rows / round-trip) so paging and indexes can be measured under realistic load

### Migrations

All schema changes go through Drizzle Kit. SQL migrations live under `packages/db/drizzle/` and are committed to the repo. Never edit the DB by hand.

## 🔐 Authentication & Authorization

### Flow

1. User registers / logs in → server validates with Zod, verifies bcrypt hash
2. Server issues **access token (24h)** + **refresh token (30d)**; the refresh token is persisted in `refresh_tokens` so it can be revoked
3. **Web:** the access token is placed in an HTTP-only `session` cookie (see `apps/web/app/lib/session.ts`); Server Actions and Route Handlers read it through the `authenticateRequest` helper
4. **Mobile:** tokens are saved with `expo-secure-store`; the app sends `Authorization: Bearer <accessToken>` on every API call
5. When the access token expires, the client calls `POST /api/auth/refresh` with the refresh token to obtain a new pair (old refresh token is invalidated)
6. `POST /api/auth/logout` deletes the refresh token row

### Authorization

- **Middleware** (`apps/web/middleware.ts`) guards protected pages (`/admin`, `/profile`, …) and redirects unauthenticated users to `/auth/login`
- **Route handlers** call `authenticateRequest(request)` and, where needed, check `payload.role === 'admin'`
- **Server Actions** call the same helpers, so the rules are identical regardless of transport
- The last-admin-protection prevents demoting or deleting the only remaining admin

## 📚 REST API

All routes return JSON. Auth routes accept either the `session` cookie (Web) or `Authorization: Bearer …` (Mobile).

### Auth

| Method | Path                  | Description                                   |
| ------ | --------------------- | --------------------------------------------- |
| POST   | `/api/auth/register`  | Create account, returns token pair            |
| POST   | `/api/auth/login`     | Authenticate, returns token pair              |
| POST   | `/api/auth/logout`    | Revoke refresh token, clear session           |
| POST   | `/api/auth/refresh`   | Rotate access + refresh tokens                |
| GET    | `/api/auth/me`        | Current user profile                          |
| PATCH  | `/api/auth/me`        | Update own name / bio                         |

### Posts

| Method | Path                              | Description                                                |
| ------ | --------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/posts`                      | Paged list. Query: `page`, `limit`, `published`, `mine`    |
| POST   | `/api/posts`                      | Create post (auth required)                                |
| GET    | `/api/posts/[idOrSlug]`           | Single post (with author, without email)                   |
| PATCH  | `/api/posts/[id]`                 | Update post (owner or admin)                               |
| DELETE | `/api/posts/[id]`                 | Delete post (owner or admin)                               |
| GET    | `/api/posts/[idOrSlug]/comments`  | Paged comments for a post                                  |
| POST   | `/api/posts/[idOrSlug]/comments`  | Add comment (auth required)                                |

### Comments

| Method | Path                  | Description                                   |
| ------ | --------------------- | --------------------------------------------- |
| PATCH  | `/api/comments/[id]`  | Edit own comment (or admin)                   |
| DELETE | `/api/comments/[id]`  | Delete own comment (or admin)                 |

### Admin

| Method | Path                          | Description                                   |
| ------ | ----------------------------- | --------------------------------------------- |
| GET    | `/api/admin/users`            | Paged users list (admin only)                 |
| PATCH  | `/api/admin/users/[id]`       | Change role / name (admin only)               |
| DELETE | `/api/admin/users/[id]`       | Delete user (admin only, protects last admin) |

## ⚡ Server Actions (Web ↔ Backend)

Defined in `apps/web/app/actions/` and used directly by the Web UI:

- `createPostAction`, `updatePostAction`, `deletePostAction`
- `createCommentAction`, `deleteCommentAction`

Each action authenticates via the session cookie, validates with Zod, persists with Drizzle, then calls `revalidatePath()` so the affected pages re-render on the next visit.

## 🛠️ Available Scripts

### Root

```bash
pnpm dev          # Start all dev servers
pnpm build        # Build all apps and packages
pnpm lint         # Lint all projects
pnpm format       # Format code with Prettier
pnpm db:migrate   # Run database migrations
pnpm db:generate  # Generate migration files
pnpm db:seed      # Seed database with sample data
```

### Web App

```bash
cd apps/web
pnpm dev          # Start Next.js dev server
pnpm build        # Build for production
pnpm start        # Start production server
```

### Mobile App

```bash
cd apps/mobile
pnpm start        # Start Expo server
pnpm android      # Run on Android
pnpm ios          # Run on iOS (macOS only)
pnpm web          # Run on web
```

## 📦 Dependencies

### Latest Versions (May 2026)

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.2.6 | React framework (web) |
| react | 19.2.4 | UI library |
| expo | ~55.0.24 | Mobile development |
| drizzle-orm | ^0.31.0 | Database ORM |
| @neondatabase/serverless | ^0.9.0 | Neon client |
| jsonwebtoken | ^9.0.3 | JWT authentication |
| bcryptjs | ^2.4.3 | Password hashing |
| zod | ^3.22.4 | Schema validation |
| tailwindcss | ^4 | CSS framework |
| pnpm | 9.0+ | Package manager |

## 🚢 Deployment

The project is designed for **serverless** deployment.

### Web (Next.js back-end + Web client) — Vercel or Netlify

1. Push the repo to GitHub.
2. Import the repository in Vercel / Netlify and pick `apps/web` as the project root (or use the root with `--filter @bloghub/web`).
3. Configure environment variables (see below).
4. Trigger the first deployment.

### Mobile (Expo Web export) — Netlify

```bash
cd apps/mobile
pnpm exec expo export --platform web
```

Deploy the produced `dist/` folder to Netlify (drag-and-drop or `netlify deploy --prod --dir=dist`). Point `EXPO_PUBLIC_API_URL` to the deployed Web (Next.js) URL so the mobile client talks to the live API.

### Optional — Android `.apk` via Expo EAS

```bash
cd apps/mobile
eas build --platform android --profile preview
```

Upload the resulting `.apk` under GitHub Releases for testers.

### Production Environment Variables

Set these in your hosting platform (Vercel / Netlify):

```env
DATABASE_URL=postgresql://user:password@region.neon.tech/database?sslmode=require
JWT_SECRET=production-secret-key-32-characters-minimum
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d
NEXT_PUBLIC_API_URL=https://your-web-domain
EXPO_PUBLIC_API_URL=https://your-web-domain
```

## 📝 Next Steps for the Maintainer

- Finalise live deployment URLs and fill them in at the top of this file
- (Optional) Add Cloudflare R2 integration for cover images / attachments
- (Optional) Wire up GitHub Actions for lint/typecheck and DB backups

## 🔗 Important Links

- [Neon PostgreSQL](https://neon.tech) - Serverless Postgres
- [Drizzle ORM](https://orm.drizzle.team) - Type-safe ORM
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev)
- [Tailwind CSS](https://tailwindcss.com)

## 🐛 Troubleshooting

### Database Connection Error

**Error**: `No matching version found for DATABASE_URL`

**Solution**: Make sure `.env.local` has correct PostgreSQL connection string format:

```
postgresql://user:password@host:port/database?sslmode=require
```

### JWT Token Issues

**Error**: `Invalid token` or `Token expired`

**Solution**:
1. Check JWT_SECRET is set and matches all apps
2. Verify token format in Authorization header: `Bearer <token>`
3. Check token expiry time in JWT_EXPIRES_IN

### Mobile App Can't Connect to API

**Error**: Network request failed

**Solution**:
1. Check `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` (must be reachable from the device)
2. Use `http://192.168.x.x:3000` (your local IP) on physical devices
3. Use `http://localhost:3000` only in the Expo web target on the same machine

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Contributing

Contributions welcome! Please follow the existing code style and submit PRs to the main branch.

---

**Made with ❤️ by the BlogHub team**
