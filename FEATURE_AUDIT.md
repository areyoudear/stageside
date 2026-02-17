# Stageside Feature Audit
**Date:** 2026-02-13
**Tester:** Alfred (AI)

## Feature List

### 🔐 Authentication & Access
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Early Access Gate | /access | ⏳ | Password protection for beta |
| Sign Up | /signup | ⏳ | Email/password registration |
| Login | /login | ⏳ | Email/password + Google OAuth |
| Session Persistence | - | ⏳ | Stay logged in across tabs/refreshes |
| Sign Out | - | ⏳ | Clear session properly |

### 🎵 Music Service Connections
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Connect Spotify | /api/music/connect/spotify | ⏳ | OAuth flow |
| Connect YouTube Music | /api/music/connect/youtube_music | ⏳ | OAuth flow |
| Sync Music Data | /api/music/sync | ⏳ | Fetch top artists |
| View Connections | /api/music/connections | ⏳ | List connected services |

### 🎪 Festivals
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Festival List | /festivals | ⏳ | Browse all festivals |
| Festival Detail | /festivals/[id] | ⏳ | View lineup, match % |
| Add to Agenda | - | ⏳ | Plus button on artists |
| My Agenda | /festivals/[id]/my-agenda | ⏳ | View saved artists |
| Build Schedule | /festivals/[id]/schedule | ⏳ | Schedule builder |

### 🎤 Concerts/Discover
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Dashboard | /dashboard | ⏳ | Main user home |
| Discover | /discover | ⏳ | Concert discovery |
| Matched Concerts | /api/concerts/matched | ⏳ | Personalized results |
| Save Concert | /api/saved-concerts | ⏳ | Bookmark concerts |
| Saved List | /saved | ⏳ | View saved concerts |

### 👥 Groups (Social)
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Groups List | /groups | ⏳ | View/create groups |
| Group Detail | /groups/[groupId] | ⏳ | Group members & matches |
| Group Festival | /groups/[groupId]/festivals/[festivalId] | ⏳ | Shared festival planning |
| Group Matches | /api/groups/[groupId]/matches | ⏳ | Combined taste matching |

### 🆕 Onboarding
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Onboarding Flow | /onboarding | ⏳ | New user setup |

### 📝 Other
| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Landing Page | / | ⏳ | Marketing homepage |
| Demo | /demo | ⏳ | Demo experience |
| Feedback | /api/feedback | ⏳ | User feedback submission |
| Email Subscribe | /api/subscribe | ⏳ | Newsletter signup |
| Artist Search | /api/artists/search | ⏳ | Search artists |

---

## Test Results

### Test Account
- Email: alfred@stageside.test
- Password: TestPassword123
- Username: alfredtest

### Detailed Test Log

#### 🔐 Authentication & Access
| Feature | Status | Notes |
|---------|--------|-------|
| Early Access Gate | ✅ PASS | Cookie-based, working |
| Sign Up | ✅ PASS | Created account test@stageside.test |
| Login | ✅ PASS | Auto-login after signup works |
| Session Persistence | ✅ PASS | New tab stays logged in |
| Sign Out | ⏳ Not tested yet | |

#### 🆕 Onboarding
| Feature | Status | Notes |
|---------|--------|-------|
| Music Service List | ✅ PASS | Shows 5 services |
| Manual Artist Entry | ✅ PASS | Search and add works |
| Artist Search API | ⚠️ WARN | Spotify token expired, but still works |
| Location Step | ✅ PASS | Skippable, works |
| Complete to Dashboard | ✅ PASS | Redirects correctly |

#### 🎪 Festivals
| Feature | Status | Notes |
|---------|--------|-------|
| Festival List | ✅ PASS | Shows categories, cards look good |
| Festival Detail | ✅ PASS | Shows lineup, 46 artists for Coachella |
| Add to Agenda | ❌ FAIL | **BUG: user_festival_agendas table missing** |
| Build My Schedule | ⏳ Not tested | |

#### 🎤 Dashboard / Concert Search
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | ✅ PASS | Shows welcome message with user name |
| Location Autocomplete | ✅ PASS | Multiple suggestions, works well |
| Date Range Picker | ✅ PASS | "Next 3 Months" works |
| Concert Search | ✅ PASS | 100 concerts found for SF! |
| Match Percentages | ✅ PASS | 50%, 45%, 31% etc shown |
| Match Reasons | ✅ PASS | "Matches your pop taste" etc |
| Ticket Links | ✅ PASS | Ticketmaster, TicketWeb links work |
| Save Concert | ✅ PASS | Button toggles correctly |
| Share Concert | ⏳ | Not tested |
| Price Alert | ⏳ | Not tested |

#### 📝 Sign Out & Sign In
| Feature | Status | Notes |
|---------|--------|-------|
| Sign Out | ✅ PASS | Returns to landing, clears session |
| Sign In (re-login) | ✅ PASS | Works with test@stageside.test |

#### 🐛 BUGS FOUND & FIXED
1. **user_festival_agendas table missing** ❌
   - Migration exists at `/supabase/migrations/002_festivals.sql`
   - **Fix:** Run migration in Supabase dashboard
   - **Impact:** "Add to schedule" button on festival artists fails with 500

2. **Spotify connect used wrong auth flow** ✅ FIXED
   - Components were calling `signIn("spotify")` instead of `/api/music/connect/spotify`
   - **Fixed in:** `SpotifyConnectButton.tsx`, `ConnectedServicesPanel.tsx`, `MusicServiceButton.tsx`
   - **Status:** Code fixed, now correctly redirects to Spotify OAuth

3. **Festival schedule shows "No schedule available"** ⚠️
   - Shows even if user has manually entered artists
   - May need to check if user has any artist data before showing this message

#### ⚠️ CONFIG ISSUES (not code bugs)
1. **Spotify redirect URI not registered**
   - Error: "INVALID_CLIENT: Invalid redirect URI"
   - **Fix:** Add `http://localhost:3000/api/music/connect/spotify/callback` to Spotify app settings

2. **Spotify API token expired**
   - Artist search shows 401 but falls back gracefully
   - **Fix:** Refresh Spotify app credentials

#### ✅ FEATURES WORKING
- Landing page
- Early access password gate
- User registration (email/password)
- Login/logout
- Session persistence across tabs
- Onboarding flow (manual artist entry)
- Dashboard concert search
- Location autocomplete
- Concert results with match scores
- Ticket links (multiple sources)
- Save concerts
- Festivals list with categories
- Festival detail page with lineup

#### ❌ FEATURES BROKEN
- Festival "Add to schedule" button (missing DB table)

#### ⏳ NOT TESTED
- Google OAuth login
- Spotify OAuth connection
- Groups feature
- Saved concerts page
- Build My Schedule feature
- Calendar export
