# Footsquad TODO

- [x] Dark mode theme with neon green accents
- [x] Database schema (players, teams, matches, ratings, highlights, chat, follows)
- [x] Backend API routes (auth, profiles, teams, matches, ratings, MOTM, highlights, chat, follow)
- [x] Tab navigation (Home, Matches, Leaderboard, Chat, Profile)
- [x] Home screen (Best Moment, Top 10 Players, Upcoming Matches)
- [x] Matches screen (Public feed, My Matches, Create Match)
- [x] Leaderboard screen (city filter, ranked list, 5+ matches requirement)
- [x] Chat screen (Team Chat, Direct Messages)
- [x] Profile screen (stats, match history, edit profile)
- [x] Match Detail screen (rosters, join, post-match rating/MOTM)
- [x] Create Match modal (city dropdown, pitch, date, format, type)
- [x] Free Agent Board screen
- [x] Team Page screen (roster, stats, manage)
- [x] Highlight system (upload, 48h expiry, likes)
- [x] Rating system (anti-cheat: rate only opponents, hidden until all submitted)
- [x] Man of the Match voting system
- [x] Points system (Win=3, Draw=1, Loss=0, MOTM=+2)
- [x] Follow system
- [x] Notifications screen
- [x] App icon and branding
- [x] Unit tests for all major features (54 tests passed)

## Corrections v2

- [x] Remove OAuth/social login, implement email+password auth in-app
- [x] Login and Signup screens fully inside the app (no browser redirect)
- [x] Profile edit (name, city, position, photo upload)
- [x] Change password option in profile
- [x] Team logo upload
- [x] Captain can add players to team
- [x] Captain can remove players from team
- [x] Friendly match: search team by name
- [x] Friendly match: send invitation to selected team
- [x] Friendly match: opponent captain accept/decline
- [x] Highlight upload (photo or short video)
- [x] Highlight auto-delete after 48 hours

## Fix Package 1: Highlights UX

- [x] Home Best Moment: carousel horizontal 9:16 Top 5-10 highlights
- [x] Highlight Detail screen (media viewer, like button, likes count, user info + city)
- [x] All Highlights screen with filters by City and Team
- [x] Player Profile: section showing active highlights (within 48h)

## Fix Package 2: Team Logo Display

- [x] Audit logoUrl flow (schema → db.ts → routers.ts → frontend)
- [x] Fix backend: logoUrl stored and returned in all team queries
- [x] Fix frontend: use logoUrl in Home match cards
- [x] Fix frontend: use logoUrl in Matches screen cards
- [x] Fix frontend: use logoUrl in Match Detail screen
- [x] Fix frontend: use logoUrl in Team Page
- [x] Proper fallback only when logoUrl is missing/null

## Fix Package 3: Free Agent Board - Create Post

- [x] Add 'note' field to players schema
- [x] Add/update API route to set availability post (city, position, availableTime, preferredFormat, note)
- [x] Free Agent Board: "Create Availability Post" button (visible when authenticated)
- [x] Create Post modal form (city, position, available time, preferred format, optional note)
- [x] Post appears in free agents list with all fields
- [x] Free agent detail screen with Message and Invite actions
