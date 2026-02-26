# Footsquad — Mobile App Interface Design

## Overview

Footsquad is a professional-style football coordination and reputation-building app. The design follows Apple HIG principles adapted for a dark, sports-broadcast aesthetic. All screens are designed for **portrait orientation (9:16)** and **one-handed usage**.

---

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| **Background** | `#0A0A0A` | Main screen background |
| **Surface** | `#1A1A1A` | Cards, elevated surfaces |
| **Foreground** | `#FFFFFF` | Primary text |
| **Muted** | `#8A8A8A` | Secondary text, labels |
| **Primary** | `#39FF14` | Neon green — accents, CTAs, active states |
| **Border** | `#2A2A2A` | Card borders, dividers |
| **Success** | `#39FF14` | Win states, positive feedback |
| **Warning** | `#FFD700` | Pending states, caution |
| **Error** | `#FF4444` | Loss states, errors |

---

## Screen List

### 1. Splash Screen
- Dark background with Footsquad logo centered
- Neon green glow animation on logo

### 2. Login / Register
- Manus OAuth login button with neon green accent
- App logo at top, tagline below
- Clean, minimal layout

### 3. Home (Tab 1 — `index`)
- **Best Moment (48h)**: Horizontal card showing top-voted highlight with player name, team, city, likes
- **Top 10 Players**: Horizontal scrollable list of player cards (FIFA-style) — only players with 5+ matches
- **Upcoming Matches**: Vertical list of match cards showing team logos, city, format, date/time, join button

### 4. Matches (Tab 2)
- **Segment control**: Public Matches | My Matches
- **Public Matches feed**: Cards with team logos, city, pitch, format, date, join/request button
- **My Matches**: Past and upcoming matches for the logged-in player
- **FAB**: Create Match button (captains only)

### 5. Leaderboard (Tab 3)
- **City filter dropdown** at top
- **Ranked list**: Position, player avatar, name, team, points, matches, avg rating, MOTM count
- Only players with 5+ matches appear
- Top 3 highlighted with gold/silver/bronze accents

### 6. Chat (Tab 4)
- **Segment control**: Team Chat | Direct Messages
- **Team Chat**: Single group chat for the player's team
- **DM List**: List of conversations with other players
- **Chat screen**: Message bubbles, input bar, send button

### 7. Profile (Tab 5)
- **Header**: Profile photo (large), full name, city + country flag
- **Stats bar**: Matches | Points | Avg Rating | MOTM
- **Position badge**: GK / DEF / MID / ATT
- **Team section**: Team name + logo OR "Free Agent" badge
- **Match history**: Scrollable list of past matches with results
- **Edit profile button**
- **Follow/Unfollow button** (on other players' profiles)

### 8. Match Detail (Stack screen)
- Match header: Team A vs Team B with logos
- City, pitch, format, date/time
- Player rosters for both teams
- Status: Upcoming / In Progress / Completed
- **Post-match**: Rating section, MOTM voting
- Join button (if spots available)

### 9. Create Match (Modal)
- Form: City dropdown, pitch name, date/time picker, format selector (5v5/8v8/11v11), max players
- Match type toggle: Public / Friendly
- For Friendly: Team search and invite

### 10. Free Agent Board (Stack screen)
- List of available free agents with: avatar, name, city, position, available time, preferred format
- Invite button for team captains

### 11. Team Page (Stack screen)
- Team logo, name, city
- Roster list with player cards
- Team stats: Total wins, matches, avg rating
- Manage roster (captain only): Accept/Remove players

### 12. Highlight Viewer (Stack screen)
- Full-screen media viewer (photo or 20s video)
- Player info overlay: name, team, city
- Like button with count
- Auto-expires indicator (time remaining)

### 13. Notifications (Stack screen)
- List of notifications: match invites, team requests, MOTM wins, rating results
- Timestamp and read/unread states

### 14. Post-Match Rating (Modal)
- List of opposing team players
- Star rating (1-5) for each
- Submit button — cannot see results until all submitted or 24h elapsed

### 15. MOTM Voting (Modal)
- List of ALL players from both teams (except self)
- Single vote selection
- Submit button

---

## Key User Flows

### Flow 1: New Player Registration
1. Open app → Splash screen
2. Tap "Login" → Manus OAuth
3. After auth → Profile setup: photo, name, city, country, position
4. Save → Lands on Home screen as Free Agent

### Flow 2: Create Team & Match
1. Profile → "Create Team" → Enter team name, upload logo, select city
2. Become Captain → Matches tab → FAB "Create Match"
3. Fill form: city, pitch, date, format, max players
4. Post → Match appears in public feed
5. Other team sends request → Captain accepts → Match confirmed

### Flow 3: Join a Match
1. Home → Upcoming Matches → Tap match card
2. Match Detail → Tap "Join" (if spots available)
3. Added to roster → Receive notification

### Flow 4: Post-Match Rating & MOTM
1. Match completed → Notification received
2. Open match → Rate opposing players (1-5 stars)
3. Vote for MOTM (any player except self)
4. Results revealed after all votes or 24h

### Flow 5: Upload Highlight
1. Profile → "Upload Highlight"
2. Select photo or record 20s video
3. Upload → Appears in Home "Best Moment" section
4. Auto-deletes after 48h

---

## Typography

- **Headings**: Bold, 24-32px, white
- **Subheadings**: Semibold, 18-20px, white
- **Body**: Regular, 14-16px, white/muted
- **Labels**: Medium, 12px, muted
- **Numbers/Stats**: Bold, monospace feel, neon green for highlights

## Card Design

- Background: `#1A1A1A`
- Border: `#2A2A2A`, 1px
- Border radius: 16px
- Shadow: subtle dark shadow
- Padding: 16px

## Button Design

- Primary: Neon green background, black text, rounded-full, glow effect
- Secondary: Transparent with neon green border
- Disabled: Dimmed opacity (0.4)

## Tab Bar

- Background: `#0A0A0A`
- Active: Neon green icon + label
- Inactive: Muted gray icon + label
- 5 tabs: Home, Matches, Leaderboard, Chat, Profile
