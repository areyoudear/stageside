# Festival Planner MVP Analysis

## Executive Summary
The festival planner has solid foundations but needs critical fixes and polish to be MVP-ready. The main gaps are: **real lineup data**, **broken UI flows**, and **missing export functionality**.

---

## Current State Assessment

### ✅ What's Working
- **Database schema** - Complete with festivals, festival_artists, user_festival_agendas tables
- **Core matching logic** - `festivals.ts` has sophisticated match scoring
- **Smart itinerary generator** - Algorithm considers conflicts, rest breaks, priorities
- **Basic UI scaffolding** - Festival list, detail, schedule, agenda pages exist
- **Group itinerary logic** - Backend function exists for multi-user planning

### ❌ What's Broken/Missing
1. **No real lineup data** - Only Coachella has 13 sample artists seeded
2. **Schedule page may crash** - No error handling for festivals without schedules
3. **ICS export untested** - generateICS() exists but likely has date bugs
4. **No save itinerary** - POST endpoint has TODO comment
5. **Group features are backend-only** - UI exists but isn't wired up

---

## User Flows Needed

### Flow 1: Discover Festivals (Browse)
```
/festivals → See festival cards with match % → Click to view details
```
**Status:** ✅ Working (needs lineup data)

### Flow 2: View Festival & Lineup
```
/festivals/[id] → See match stats → Browse lineup → Add to agenda
```
**Status:** ⚠️ Partially working (no schedule data for most festivals)

### Flow 3: Build Personal Schedule
```
/festivals/[id]/schedule → See AI-generated itinerary → Adjust settings → Export
```
**Status:** ⚠️ UI exists but no lineup = empty schedule

### Flow 4: Manual Agenda Building
```
/festivals/[id] → Click artists to add → /festivals/[id]/my-agenda → Export to calendar
```
**Status:** ⚠️ Works if lineup exists, export needs testing

### Flow 5: Calendar Export
```
My Agenda → Export → Download .ics file → Import to Google/Apple Calendar
```
**Status:** ❓ Untested, likely broken

### Flow 6: Share Itinerary (MVP stretch)
```
My Agenda → Share → Generate link → Friend views schedule
```
**Status:** ❌ Not implemented

### Flow 7: Group Festival Planning (MVP stretch)
```
Create group → Invite friends → See combined recommendations → Build shared agenda
```
**Status:** ❌ Backend only, no UI integration

---

## MVP Requirements Checklist

### P0 - Must Have
- [ ] **Real lineup data for 5+ festivals** (Coachella, Outside Lands, Lollapalooza, Bonnaroo, Governors Ball)
- [ ] **Fix schedule grid** - Handle empty lineups gracefully
- [ ] **Fix ICS export** - Date parsing issues, test with Google Calendar
- [ ] **Loading states** - Better UX when fetching data
- [ ] **Error states** - Show helpful messages when no data

### P1 - Should Have
- [ ] **Save custom itinerary** - Persist user's modified schedule
- [ ] **Schedule swapping UI** - Click to swap conflicting artists
- [ ] **Copy schedule as text** - For sharing in messages
- [ ] **Image export** - Save agenda as shareable image

### P2 - Nice to Have
- [ ] **Share link** - Public URL for agenda
- [ ] **Notifications** - Remind before set times
- [ ] **Spotify playlist** - Generate playlist from agenda

---

## Technical Tasks

### Task 1: Seed Lineup Data (4-6 hours)
**Files:** `supabase/migrations/`, `src/app/api/admin/seed-festivals/route.ts`

1. Research real 2025/2026 lineups for:
   - Outside Lands (Aug 2025)
   - Lollapalooza (Jul 2025)
   - Bonnaroo (Jun 2025)
   - Governors Ball (Jun 2025)
   - ACL (Oct 2025)

2. Create seed script with:
   - Artist names with normalized versions
   - Day assignments (Friday/Saturday/Sunday)
   - Stage names
   - Set times (approximate if not announced)
   - Headliner flags
   - Genre tags

3. Add Spotify IDs for top 50 artists per festival (enables artist images)

### Task 2: Fix Schedule Grid (2 hours)
**Files:** `src/components/festivals/ScheduleGrid.tsx`, `src/app/festivals/[id]/schedule/page.tsx`

1. Add empty state when no schedule data
2. Handle missing day/time gracefully
3. Show "TBD" for artists without set times
4. Test with Coachella data

### Task 3: Fix ICS Export (2 hours)
**Files:** `src/lib/festivals.ts` (generateICS), `src/app/api/festivals/[id]/agenda/route.ts`

1. Fix date parsing in `getDateFromDayName()`
2. Add timezone handling (use festival location)
3. Test by importing to Google Calendar
4. Add event reminders (30 min before)

### Task 4: Save Custom Itinerary (2 hours)
**Files:** `src/app/api/festivals/[id]/itinerary/route.ts`, new `user_itineraries` table

1. Create DB table for custom itineraries
2. Implement POST endpoint to save
3. Load saved itinerary in GET if exists
4. Add "Reset to AI suggestions" button

### Task 5: UI Polish (3 hours)
**Files:** Various components

1. Add skeleton loaders everywhere
2. Better error messages
3. Mobile responsiveness audit
4. Consistent empty states

### Task 6: Copy/Share Features (2 hours)
**Files:** `src/components/festivals/AgendaView.tsx`

1. "Copy as text" - Format agenda as plaintext
2. Share button with Web Share API
3. Generate shareable image (html2canvas)

---

## Agent Task Distribution

### Agent 1: Lineup Data Seeder
- Research actual festival lineups
- Create comprehensive seed migrations
- Test seed script locally

### Agent 2: Schedule & Export Fixes
- Fix ScheduleGrid edge cases
- Fix ICS generation bugs
- Test calendar import flow

### Agent 3: API & Persistence
- Implement save itinerary endpoint
- Create user_itineraries table
- Wire up frontend to save/load

### Agent 4: UI/UX Polish
- Add loading states
- Fix mobile layouts
- Implement copy/share

---

## Database Changes Needed

```sql
-- Add user_itineraries table for custom schedules
CREATE TABLE user_festival_itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  itinerary JSONB NOT NULL, -- The full GeneratedItinerary object
  settings JSONB, -- maxPerDay, restBreak, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, festival_id)
);
```

---

## Success Metrics
- User can browse 5+ festivals with real lineups
- User can generate personalized itinerary
- User can export to Google Calendar successfully
- No console errors on any festival page
- Mobile-friendly experience
