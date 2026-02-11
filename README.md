# Setlist - Concert Discovery & Festival Planner

Discover concerts from artists you love, and plan your festival experience with personalized recommendations.

## Features

### 🎤 Concert Discovery
Connect your music streaming services and find concerts that match your taste:
- **Multi-service support:** Spotify, Apple Music, YouTube Music, Tidal, Deezer
- **Personalized matching:** Concerts ranked by how well they match your listening history
- **Location-aware:** Search by city or let us find shows near you
- **Date flexibility:** Filter by date range, perfect for trip planning

### 🎪 Festival Planner (NEW)
Plan your festival experience with AI-powered recommendations:
- **Festival Match %:** See how well each festival's lineup matches your taste
- **Personalized recommendations:** Discover which artists you'll love
- **Schedule Builder:** Build your personal agenda with a visual grid
- **Conflict Detection:** Get alerts when recommended artists overlap
- **Calendar Export:** Export your agenda to Google/Apple Calendar

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Auth:** NextAuth.js with Spotify OAuth
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI + shadcn/ui
- **Concert Data:** Ticketmaster Discovery API
- **Music Data:** Spotify API (with plans for more services)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Spotify Developer App
- Ticketmaster API key

### Environment Variables

Create a `.env.local` file:

```bash
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Spotify
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Ticketmaster
TICKETMASTER_API_KEY=your-ticketmaster-key
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
# (Apply SQL files in supabase/migrations/ to your Supabase project)

# Start development server
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # NextAuth handlers
│   │   ├── concerts/       # Concert search API
│   │   ├── festivals/      # Festival data API
│   │   │   └── [id]/
│   │   │       └── agenda/ # User agenda management
│   │   └── matches/        # Personalized concert matching
│   ├── dashboard/          # Main concert discovery page
│   ├── festivals/          # Festival planner pages
│   │   └── [id]/
│   │       ├── schedule/   # Schedule grid builder
│   │       └── my-agenda/  # Personal agenda view
│   └── page.tsx            # Landing page
├── components/
│   ├── festivals/          # Festival-specific components
│   │   ├── FestivalCard.tsx
│   │   ├── ArtistCard.tsx
│   │   ├── MatchPercentage.tsx
│   │   ├── ScheduleGrid.tsx
│   │   ├── AgendaView.tsx
│   │   └── ConflictResolver.tsx
│   └── ui/                 # Base UI components
└── lib/
    ├── festivals.ts        # Festival matching logic
    ├── festival-types.ts   # TypeScript types
    ├── spotify.ts          # Spotify API integration
    ├── ticketmaster.ts     # Ticketmaster API
    └── supabase.ts         # Database operations
```

## Database Schema

### Festivals Table
```sql
festivals (
  id UUID PRIMARY KEY,
  name TEXT,
  slug TEXT UNIQUE,
  location JSONB,   -- {city, state, country, venue}
  dates JSONB,      -- {start, end, year}
  genres TEXT[],
  website_url TEXT,
  ticket_url TEXT,
  image_url TEXT,
  capacity TEXT,    -- small/medium/large/massive
  camping BOOLEAN
)
```

### Festival Artists Table
```sql
festival_artists (
  id UUID PRIMARY KEY,
  festival_id UUID REFERENCES festivals,
  artist_name TEXT,
  normalized_name TEXT,
  day TEXT,         -- "Friday", "Saturday", etc.
  stage TEXT,
  start_time TEXT,  -- "14:00"
  end_time TEXT,    -- "15:30"
  headliner BOOLEAN,
  spotify_id TEXT,
  genres TEXT[]
)
```

### User Festival Agendas Table
```sql
user_festival_agendas (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  festival_id UUID REFERENCES festivals,
  artist_ids UUID[],
  notes TEXT,
  UNIQUE(user_id, festival_id)
)
```

## Festival Match Algorithm

The festival match percentage is calculated by analyzing lineup overlap with user preferences:

```typescript
For each artist in festival lineup:
  - In user's top artists → 100 points (Perfect Match)
  - Matches user's top genres → 30-70 points (Genre Match)
  - Similar sound profile → 20-40 points (Discovery)

Festival Match % = (totalScore / maxPossibleScore) * 100
```

### Match Types

- **Perfect Match (⭐):** Artist is in user's top listened artists
- **Discovery (✨):** Artist matches user's genre preferences but isn't directly listened to

## User Journeys

### Journey A: Concert Discovery
1. Connect Spotify → Set location/dates → See matched concerts → Get tickets

### Journey B: Festival Exploration
1. Browse festivals → See match % → Explore lineup → Discover new artists

### Journey C: Festival Schedule Builder
1. Select festival → View schedule grid → Add to agenda → Resolve conflicts → Export

## API Endpoints

### Festivals
- `GET /api/festivals` - List festivals (with match % if authenticated)
- `GET /api/festivals/[id]` - Festival detail with lineup and schedule

### Festival Agenda
- `GET /api/festivals/[id]/agenda` - Get user's agenda
- `POST /api/festivals/[id]/agenda` - Add artist to agenda
- `DELETE /api/festivals/[id]/agenda` - Remove artist from agenda
- `PUT /api/festivals/[id]/agenda` - Export agenda as ICS file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

---

Built with ❤️ for music fans who hate missing their favorite artists.
