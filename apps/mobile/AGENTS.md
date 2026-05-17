# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

# BlogHub mobile app

Expo Router (file-based routing under `app/`) consuming the same JSON API that
ships with `apps/web`. Same auth model: short-lived JWT access token plus
refresh token returned by `/api/auth/login` and `/api/auth/register`.

## Configuration

- The API base URL comes from `process.env.EXPO_PUBLIC_API_URL`. Define it in
  `.env` for local dev (e.g. `http://10.0.2.2:3000` for Android emulator,
  `http://localhost:3000` for iOS simulator). Never hard-code the URL in
  components.
- Secrets / tokens are persisted via `expo-secure-store`. The wrapper lives
  in `lib/secureStorage.ts` — always go through it instead of touching
  `SecureStore` directly so we can swap the storage backend if needed.

## Routing

- File-based routing only. Groups:
  - `(auth)/login.tsx`, `(auth)/register.tsx` — unauthenticated entry points.
  - `(blog)/index.tsx` — paginated public feed.
  - `(blog)/[slug].tsx` — post detail + comments.
- `app/_layout.tsx` is the root layout. Any guard logic (redirect to
  `/login` when no token) belongs here, NOT in individual screens.

## API conventions

- Responses match the web app: `{ success, data }` or `{ error, details? }`.
- Send `Authorization: Bearer <accessToken>` on protected requests. On 401,
  attempt one refresh via `/api/auth/refresh`, then bounce to login.
- Paginate every list endpoint (`?page=&limit=`). The seeded dataset has
  ~10 k posts / ~30 k comments — fetching without `limit` will time out the
  mobile client.

## UI conventions

- Use the shared themed primitives in `components/Themed.tsx` (`View`, `Text`)
  so dark mode keeps working.
- Keep layout responsive: use Flexbox + percentage / `Dimensions` based widths.
  No hard-coded pixel widths above 24 px on container elements.
- Surface server errors with a visible message, not just a console log.

## Commands

```pwsh
pnpm --filter mobile start         # Expo dev server
pnpm --filter mobile android       # run on Android device/emulator
pnpm --filter mobile ios           # run on iOS simulator (macOS only)
pnpm --filter mobile lint
```

Schema, migrations and seeding belong to `packages/db` — never run DDL from
inside the mobile app.
