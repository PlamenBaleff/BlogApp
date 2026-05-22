# 🚀 BlogHub Setup Guide - Next Steps

This guide walks you through setting up your BlogHub application for development.

## Step 1: Setup Neon PostgreSQL Database

### Option A: Using Neon (Recommended)

1. **Create Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up with GitHub, Google, or email
   - Create a new project (e.g., "bloghub")

2. **Get Connection String**
   - In Neon dashboard, go to "Connection string"
   - Copy the connection string
   - Format: `postgresql://user:password@host:port/database?sslmode=require`

3. **Update Environment**
   - Open `.env.local` in the project root
   - Paste the connection string as `DATABASE_URL`

### Option B: Local PostgreSQL

1. **Install PostgreSQL** on your machine
2. **Create Database**
   ```bash
   createdb bloghub
   ```

3. **Set Connection String**
   ```env
   DATABASE_URL=postgresql://localhost/bloghub
   ```

## Step 2: Update `.env.local`

Copy from `.env.example` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database Connection (from Neon or local PostgreSQL)
DATABASE_URL=postgresql://user:password@region.neon.tech/database?sslmode=require

# JWT Configuration (use a random secret, at least 32 characters)
JWT_SECRET=your-random-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Generate JWT Secret

**On macOS/Linux:**
```bash
openssl rand -base64 32
```

**On Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

Or just use any random 32+ character string.

## Step 3: Install Dependencies

```bash
pnpm install
```

This installs dependencies for all apps and packages (web, mobile, db, api, types).

## Step 4: Create Database Schema

### Generate and Run Migrations

```bash
# Generate migration files from schema
pnpm db:generate

# Apply migrations to your database
pnpm db:migrate
```

**Expected Output:**
```
✅ Migration complete
Tables created:
  - users
  - posts
  - comments
  - refresh_tokens
```

### (Optional) Seed Sample Data

```bash
pnpm db:seed
```

This adds:
- 1 sample user: `author@example.com` (password: none - you'll need to manually set)
- 3 sample blog posts
- Sample comments

## Step 5: Start Development Servers

### Start All Servers

```bash
pnpm dev
```

**Output:**
```
web:     ready - started server on 0.0.0.0:3000
mobile:  Expo DevTools at http://localhost:8081
```

### Or Start Individually

**Web only:**
```bash
cd apps/web
pnpm dev
```

**Mobile only:**
```bash
cd apps/mobile
pnpm start
```

## Step 6: Test the Application

### Register a New Account

1. Go to http://localhost:3000/auth/register
2. Fill in name, email, password
3. You'll be redirected to `/admin`

### Create a Blog Post

1. Go to http://localhost:3000/admin/posts/new
2. Fill in:
   - **Title**: "My First Post"
   - **Slug**: "my-first-post"
   - **Content**: Your blog content
   - **Excerpt**: A summary
   - **Tags**: "bloghub, first-post"
3. Click "Create Post"

### View Published Posts

1. Go to http://localhost:3000/blog
2. Your posts appear here (need to publish via API or admin panel)

### Test Mobile App

**Web Browser:**
```bash
cd apps/mobile
pnpm web
```

**Expo Go (iOS/Android):**
```bash
cd apps/mobile
pnpm start
# Scan QR code with Expo Go app
```

## Troubleshooting

### ❌ Error: `DATABASE_URL is not set`

**Fix:** Make sure `.env.local` exists in the project root with `DATABASE_URL` set.

```bash
ls -la .env.local
```

### ❌ Error: `connect ECONNREFUSED 127.0.0.1:5432`

**Fix:** Check if PostgreSQL is running (local) or verify Neon connection string.

```bash
# Test Neon connection
psql "your-connection-string-here"
```

### ❌ Error: `listen EADDRINUSE :::3000`

**Fix:** Port 3000 is in use. Kill the process or use different port:

**macOS/Linux:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Windows PowerShell:**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or start on different port:
```bash
PORT=3001 pnpm dev
```

### ❌ Mobile can't connect to API

**Issue:** Using `localhost` from physical device

**Fix:** Use your machine's IP address:

```bash
# Find your IP (macOS/Linux)
ifconfig | grep "inet "

# Find your IP (Windows)
ipconfig
```

Then update `.env` in mobile:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

### ❌ pnpm: command not found

**Fix:** Install pnpm globally:

```bash
npm install -g pnpm
```

Verify:
```bash
pnpm --version  # Should show 9.0.0+
```

## Common Commands Reference

```bash
# Development
pnpm dev                  # Start all servers
pnpm dev --filter web     # Start only web app
pnpm dev --filter mobile  # Start only mobile app

# Database
pnpm db:generate          # Generate migrations
pnpm db:migrate           # Apply migrations
pnpm db:seed              # Add sample data

# Build
pnpm build                # Build all apps
pnpm lint                 # Lint all code
pnpm format               # Format code

# Web specific
cd apps/web && pnpm dev
cd apps/web && pnpm build

# Mobile specific
cd apps/mobile && pnpm start
cd apps/mobile && pnpm android
cd apps/mobile && pnpm ios
```

## Next Development Steps

After setup is complete:

1. ✅ **Explore the codebase**
   - Check `apps/web/app` for Next.js routes
   - Check `apps/mobile/screens` for React Native screens
   - Review `packages/db/src/schema.ts` for database structure

2. ✅ **Understand authentication**
   - Register at `/auth/register`
   - Login at `/auth/login`
   - Check token storage in localStorage (web) / SecureStore (mobile)

3. ✅ **Create content**
   - Create posts at `/admin/posts/new`
   - View posts at `/blog`
   - Edit/delete posts via API

4. ✅ **Customize**
   - Update tailwind.config.ts for styling
   - Modify theme in apps/web/app/layout.tsx
   - Add more features as needed

5. ✅ **Deploy**
   - Deploy web to Vercel
   - Deploy mobile with EAS Build
   - Set production environment variables

## Getting Help

- Check [README.md](./README.md) for project overview
- Review existing code comments
- Check [Drizzle ORM docs](https://orm.drizzle.team)
- Check [Next.js docs](https://nextjs.org/docs)
- Check [Expo docs](https://docs.expo.dev)

## Project Statistics

- **Languages**: TypeScript
- **Packages**: 6 (web, mobile, db, api, types, root)
- **Database Tables**: 4 (users, posts, comments, refresh_tokens)
- **API Routes**: 6 (auth + posts endpoints)
- **Web Pages**: 6 (home, blog, post detail, login, register, admin)
- **Mobile Screens**: 3 (login, blog list, post detail)

---

## Expo Web (Netlify) Deployment

- The Expo app is deployed as a static web app to Netlify: https://bloghub-mobile.netlify.app
- The API URL is set via `EXPO_PUBLIC_API_URL` in `.env` and in the Netlify dashboard (must match the web app URL)
- Image upload works in browser (web only) via `/api/upload` (Cloudflare R2)
- Keyboard auto-scroll fix: input fields are always visible when typing on mobile browsers

### Required .env variables (must match Netlify dashboard)

```
NEXT_PUBLIC_API_URL=https://scintillating-cascaron-fd5193.netlify.app
EXPO_PUBLIC_API_URL=https://scintillating-cascaron-fd5193.netlify.app
```

- For local dev, set these in `.env` and `.env.local` as well.
- For production, always update the Netlify dashboard env vars after changing URLs.

---

**🎉 You're all set! Start with `pnpm dev` and happy coding!**
