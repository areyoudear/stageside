# Stageside User Flow Testing - Feb 22, 2026

## Pages Tested

### ✅ Dashboard (Concerts)
- **Working well:** Concert cards display with match scores, color-coded bars (green/yellow/orange)
- **Working well:** Location/radius selector, date range picker
- **Working well:** Min Match slider filter
- **Working well:** Show filters (All, Interested, Going, Friends Interested, Friends Going)
- **Working well:** "17 perfect matches found" header with refresh button
- **Issue:** Concert cards don't appear to be clickable (no detail modal or page opens when clicking)
- **Question:** Should clicking a card show more details or go to ticket purchase?

### ✅ Festivals
- **Working well:** Festival Planner layout with search + genre filters
- **Working well:** "Your Top Matches" section with match scores
- **Working well:** "Popular Festivals" and "Upcoming Festivals" sections
- **Minor issue:** Same festivals appear in multiple sections (feels repetitive)
- **Observation:** Very low match scores (7%, 2%) - might be because festival embeddings aren't well-tuned yet

### ✅ Saved
- **Working well:** Empty state with "No saved concerts yet" message
- **Working well:** CTA button "Discover Concerts" to go find concerts

### ✅ Friends
- **Working well:** "Add a Friend" search box
- **Working well:** "Your Friends (2)" list showing Steven Salzwedel and Alfred
- **Working well:** Each friend has view profile (arrow) and remove (X) buttons

### ✅ Settings
- **Working well:** Profile section (photo, name, email, username)
- **Working well:** Favorite Artists section with many artists as chips (removable)
- **Working well:** Favorite Genres section with toggleable chips
- **Working well:** Connected Services showing Spotify connected, synced 12h ago
- **Working well:** Email Notifications with enable toggle, location, radius, min match score, frequency
- **Working well:** Taste Profile with "Update Taste" button
- **Working well:** Sign Out button

### ✅ Login
- **Working well:** Clean design with Google OAuth + email/password options
- **Working well:** "Forgot password?" and "Create one" links

### ✅ Onboarding
- **Working well:** Step 1/3 "Your Vibe" - Energy level and Crowd size sliders
- **Working well:** "Why do you go out?" multi-select (Dance, Emotional lyrics, Production spectacle, Community vibe)
- **Not tested:** Steps 2 and 3 (would need to go through flow)

---

## Issues & Improvements Needed

### 🔴 High Priority
1. **Concert card interaction** - Clicking a concert card doesn't do anything. Should either:
   - Open a detail modal with more info, save button, ticket link
   - Navigate to a concert detail page
   - At minimum, show a hover state indicating it's clickable

2. **Match scores showing 0%** - User reported seeing 0% everywhere. Need to investigate why vector matching scores aren't displaying for all users (might be caching issue or need hard refresh)

### 🟡 Medium Priority
3. **Festival match scores** - Very low (2%, 7%) for major festivals like Outside Lands, Lollapalooza. May need to tune the festival embedding algorithm.

4. **Festival deduplication** - Same festivals appear in "Your Top Matches", "Popular", and "Upcoming" sections. Consider deduplicating.

5. **Spotify sync status** - Shows "Synced 12h ago" but vector embedding may not have been created. Need clearer sync status indicator.

### 🟢 Low Priority / Nice to Have
6. **Onboarding completion indicator** - In Settings, no clear indicator if user has completed onboarding or what their current taste profile looks like.

7. **Concert preview audio** - The Spotify preview feature (from last night's work) - verify it's working on concert cards

8. **Mobile responsiveness** - Need to test on mobile viewport

---

## What's Working Well ✨
- Clean, dark-mode UI
- Navigation is clear and intuitive
- Vector matching is producing scores (when working)
- Settings page is comprehensive
- Onboarding flow looks polished
- Social features (friends) are functional
- Email notification settings are detailed

---

## Next Steps
1. Fix concert card click interaction
2. Debug why some users see 0% match scores
3. Improve festival matching algorithm
4. Test on mobile
5. Verify audio preview functionality
