# CLAUDE.md - Stageside Project Guide

## ⚠️ RULES - READ FIRST
1. **THOROUGHLY TEST EVERYTHING** - No assumptions, actually verify
2. **LOGIN WITH TEST ACCOUNT** - Try the full flow as a real user
3. **OPEN NEW TAB, TRY AGAIN** - Test session persistence
4. **ONLY MARK COMPLETE IF IT WORKS** - If broken, fix it before moving on

## 🧪 Test Account
- **Email:** alfred@stageside.test
- **Password:** TestPassword123
- **Username:** alfredtest


## Project Overview
Stageside is a concert/festival discovery app that matches users with events based on their music taste (via Spotify, Apple Music, etc.).

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase (PostgreSQL)
- **Auth:** NextAuth.js (JWT strategy, 30-day sessions)
- **Analytics:** PostHog
- **APIs:** Spotify, Ticketmaster, Bandsintown, SeatGeek

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── music/         # Music service connections (Spotify, etc.)
│   │   ├── festivals/     # Festival data endpoints
│   │   └── concerts/      # Concert search/aggregation
│   ├── festivals/         # Festival pages
│   ├── dashboard/         # User dashboard
│   └── login/             # Auth pages
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   └── festivals/        # Festival-specific components
└── lib/                  # Utilities
    ├── auth.ts           # NextAuth config
    ├── supabase.ts       # Database client
    └── analytics.ts      # PostHog tracking
```

## Key Patterns

### Authentication Flow
1. Users sign up/login via email+password OR Google OAuth
2. Music services (Spotify, YouTube Music) are connected separately via `/api/music/connect/[service]`
3. Session stored as JWT cookie for 30 days

### Music Service Connection
- NOT an auth provider — it's a data source
- Uses separate OAuth flow: `/api/music/connect/spotify` → callback → store tokens in DB
- Tokens stored in `user_music_connections` table

### Festival Matching
- `matchType`: "perfect" (user follows artist), "discovery" (genre match), "none"
- Artists stored with schedule info (day, stage, start_time)

## Coding Conventions
- Use TypeScript strictly (no `any` without reason)
- Components are "use client" only when needed (hooks, interactivity)
- API routes use NextResponse
- Track user actions via `analytics.track()` with typed events

## Common Gotchas
- Spotify is for music data, NOT authentication (don't use `signIn("spotify")`)
- Early access password protection in middleware (disable via `DISABLE_PASSWORD_PROTECTION=true`)
- Session debug mode is on in development (safe to ignore warnings)

## Quick Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
```

## Environment Variables
See `.env.local` for required vars:
- `NEXTAUTH_SECRET` - JWT signing key
- `SPOTIFY_CLIENT_ID/SECRET` - Music service OAuth
- `NEXT_PUBLIC_SUPABASE_*` - Database
- `NEXT_PUBLIC_POSTHOG_KEY` - Analytics
