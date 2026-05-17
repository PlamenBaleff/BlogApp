# BlogHub - Full-Stack Blog Application

A modern, full-stack blog platform built with **Next.js 16**, **React 19**, **Expo**, **Drizzle ORM**, and **Neon PostgreSQL**. This monorepo includes web and mobile applications sharing a unified backend.

## 📋 Project Structure

```
bloghub/
├── apps/
│   ├── web/                 # Next.js web application (App Router)
│   │   ├── app/
│   │   │   ├── api/         # REST API routes
│   │   │   ├── blog/        # Blog listing & detail pages
│   │   │   ├── auth/        # Login/Register pages
│   │   │   ├── admin/       # Admin panel
│   │   │   └── layout.tsx    # Root layout with navigation
│   │   └── components/       # Shared components
│   │
│   └── mobile/              # Expo app (React Native)
│       ├── app/
│       │   ├── (auth)/       # Authentication screens
│       │   └── (blog)/       # Blog screens
│       └── screens/          # Screen components
│
├── packages/
│   ├── db/                  # Drizzle ORM & database
│   │   ├── src/
│   │   │   ├── schema.ts     # Database schema
│   │   │   ├── index.ts      # DB client
│   │   │   └── seed.ts       # Seed script
│   │   └── drizzle.config.ts
│   │
│   ├── api/                 # Shared API utilities
│   │   └── src/
│   │       └── auth/         # JWT & bcrypt utilities
│   │
│   └── types/               # Shared TypeScript types
│       └── src/
│           ├── blog.ts       # Blog types
│           ├── auth.ts       # Auth types
│           └── api.ts        # API types
│
├── pnpm-workspace.yaml      # pnpm workspace config
├── turbo.json               # Turbo monorepo config
└── package.json             # Root scripts
```

## 🚀 Quick Start

### 1. **Prerequisites**

- Node.js 20+
- pnpm 9.0+ (installed globally: `npm install -g pnpm`)
- PostgreSQL database (or Neon account)

### 2. **Setup Environment Variables**

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

### 3. **Install Dependencies**

```bash
pnpm install
```

### 4. **Create Neon PostgreSQL Database**

1. Go to [neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy the connection string (with password)
4. Paste into `.env.local` as `DATABASE_URL`

### 5. **Run Migrations**

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

### 6. **Start Development Servers**

Run all development servers in parallel:

```bash
pnpm dev
```

This starts:
- **Web**: `http://localhost:3000`
- **Mobile**: Expo at `http://localhost:8081` (follow CLI instructions)

## 📱 Features

### Web Application (Next.js)

- ✅ **Blog Listing**: Published posts with pagination (ISR with 1-hour revalidation)
- ✅ **Blog Detail**: Full post view with comments
- ✅ **Authentication**: Register/Login with JWT
- ✅ **Create Posts**: Protected route for authenticated users (server actions)
- ✅ **Responsive Design**: Tailwind CSS with dark mode

### Mobile Application (Expo)

- ✅ **Blog Listing**: FlatList with pull-to-refresh
- ✅ **Blog Detail**: Full post view
- ✅ **Authentication**: Login with secure token storage
- ✅ **Cross-Platform**: Works on iOS, Android, and web

### Backend (Shared)

- ✅ **REST API Routes**: `/api/auth/*` and `/api/posts/*`
- ✅ **Database**: Drizzle ORM with Neon PostgreSQL
- ✅ **Authentication**: JWT tokens + refresh tokens
- ✅ **Password Hashing**: bcryptjs
- ✅ **Validation**: Zod schemas

## 🗄️ Database Schema

### Tables

- **users**: User accounts with email, name, bio, avatar
- **posts**: Blog posts with title, slug, content, tags, publish status
- **comments**: Comments on blog posts
- **refresh_tokens**: Stored refresh tokens for revocation

### Key Features

- Full-text search ready with tags in JSONB
- Cascade delete for data integrity
- ISR support with publishedAt timestamps
- Automatic created/updated timestamps

## 🔐 Authentication Flow

### Register/Login

1. User provides email, name, password
2. Password hashed with bcryptjs (10 rounds)
3. JWT access token (24h expiry) + refresh token (30d expiry) returned
4. Tokens stored in localStorage (web) or SecureStore (mobile)

### Protected Routes

- Middleware verifies JWT before accessing `/admin`, `/dashboard`
- Invalid/expired tokens redirect to login

### Token Refresh

1. Access token short-lived (24h)
2. Refresh token long-lived (30d)
3. Implement refresh endpoint: POST `/api/auth/refresh`

## 🔄 ISR (Incremental Static Regeneration)

- **Blog listing** (`/blog`): Revalidates every 1 hour
- **Blog detail** (`/blog/[slug]`): Dynamic routes with `generateStaticParams()`
- On post creation/update, trigger manual revalidation via `revalidatePath()`

## 📚 API Routes

### Authentication

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login and get tokens

### Posts

- `GET /api/posts?page=1&limit=10` - List posts
- `GET /api/posts/[id]` - Get single post with comments
- `POST /api/posts` - Create post (requires auth)
- `PUT /api/posts/[id]` - Update post (requires auth + ownership)
- `DELETE /api/posts/[id]` - Delete post (requires auth + ownership)

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

### Vercel (Next.js Web)

1. Push to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Set environment variables (DATABASE_URL, JWT_SECRET, etc.)
4. Deploy with one click

### EAS Build (Expo Mobile)

```bash
cd apps/mobile
eas build --platform ios
eas build --platform android
eas submit  # Submit to App Store/Play Store
```

### Environment Variables for Production

Set these in your hosting platform:

```env
DATABASE_URL=postgresql://user:password@region.neon.tech/database?sslmode=require
JWT_SECRET=production-secret-key-32-characters-minimum
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_MOBILE_API_URL=https://yourdomain.com
```

## 📝 Next Steps

1. **Setup Database**: Create Neon account and get connection string
2. **Run Migrations**: `pnpm db:migrate`
3. **Seed Data**: `pnpm db:seed`
4. **Start Development**: `pnpm dev`
5. **Test Authentication**: Register/login at `http://localhost:3000/auth/register`
6. **Create Posts**: Navigate to `http://localhost:3000/admin/posts/new`
7. **Test Mobile**: Run `cd apps/mobile && pnpm start`

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
1. Check EXPO_PUBLIC_API_URL in `.env` (must be accessible from device)
2. Use `http://192.168.x.x:3000` (your local IP) on physical devices
3. Use `http://localhost:3000` in Expo Go on same machine

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Contributing

Contributions welcome! Please follow the existing code style and submit PRs to the main branch.

---

**Made with ❤️ by the BlogHub team**
