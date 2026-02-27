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

## Fix Join Match Flow + Roster + Captain Approval

- [x] Schema: add teamSide (A/B) to match_players, add joinStatus (pending/approved/declined) to match_players
- [x] Schema: maxPlayers field is per team (5v5 = 5 per team, not 10 total)
- [x] Backend: join route asks teamSide, creates pending join request, notifies captain
- [x] Backend: captain approve/decline join request route
- [x] Backend: roster query returns players per team with photo + name
- [x] Backend: disable join when team roster is full (>= maxPlayersPerTeam)
- [x] Frontend: Join button shows team selection modal (Team A / Team B)
- [x] Frontend: pending join request shows "Awaiting Approval" state
- [x] Frontend: captain sees pending requests with Accept/Decline buttons
- [x] Frontend: Match Detail shows both team rosters (name + photo) clearly
- [x] Frontend: full team shows "Team Full" badge, join disabled

## Fix Public Match: Request to Play + Home Filtering

- [x] Backend: requestToPlay validates public match, no opponent, not own team, no duplicate, notifies captain
- [x] Backend: acceptRequest assigns teamBId, confirms match, declines other requests, notifies accepted team
- [x] Backend: declineRequest notifies declined team captain
- [x] Backend: getMatchRequestById function added to db.ts
- [x] Backend: getUpcomingMatches filters only confirmed matches with two teams
- [x] Frontend: 'Request to Play vs this Team' button (public match, other captains only)
- [x] Frontend: Challenge Request Sent banner after requesting
- [x] Frontend: Creator captain sees pending play requests with Accept/Decline
- [x] Home: only confirmed matches with two teams shown (22 tests passed)

## Fix Friendly Match Invite Flow

- [x] Backend: createMatch friendly never sets teamBId at creation, starts as pending
- [x] Backend: inviteTeam checks confirmed opponent (not pending), prevents duplicate invites, notifies captain
- [x] Backend: acceptRequest sets teamBId + status = confirmed (friendly)
- [x] Backend: getPublicMatches excludes friendly matches entirely
- [x] Backend: getUpcomingMatches excludes unconfirmed friendly matches
- [x] Backend: getPlayerMatches includes matches created by captain (even without roster entry)
- [x] Frontend: create-match.tsx sends invite after creation (not at creation)
- [x] Frontend: match/[id].tsx shows 'Invitation sent' banner for creator waiting
- [x] Frontend: match/[id].tsx shows Pending Invitations section for friendly creator
- [x] Frontend: invited team captain sees Accept/Decline card (18 tests passed)

## Fix Date/Time Input + Expired Matches

- [x] Install @react-native-community/datetimepicker
- [x] create-match.tsx: replace text input with native date picker
- [x] create-match.tsx: replace text input with native time picker
- [x] create-match.tsx: date+time required validation (prevent submit if missing)
- [x] Backend: getPublicMatches filters out expired matches (matchDate < now)
- [x] Backend: getUpcomingMatches already filters expired (gte matchDate)
- [x] Backend: getPlayerMatches excludes cancelled matches, keeps completed ones

## Fix Signout + Keyboard + Player Search

- [x] Signout button calls logout() + router.replace('/login') in profile.tsx
- [x] KeyboardAvoidingView in login/signup screen
- [x] KeyboardAvoidingView in chat screen (DM and team chat)
- [x] KeyboardAvoidingView in free-agents modal form
- [x] KeyboardAvoidingView in team search modal (create-match)
- [x] Add Player in team/[id].tsx: uses player.search with LIKE query (min 2 chars)
- [x] Add Player: player.search route added to backend with db.searchPlayers (21 tests passed)

## NPC Seed Data + Integration Tests

- [ ] Read schema and db.ts to understand all table structures
- [ ] Create seed script with 10 NPC players, 2 teams, 3 matches (confirmed, pending, completed)
- [ ] Seed: team chat messages, direct messages
- [ ] Seed: highlights with likes
- [ ] Seed: follow relationships
- [ ] Seed: MOTM votes and ratings
- [ ] Seed: match invitations (friendly + public request)
- [ ] Seed: notifications for each event type
- [ ] Seed: points and ratings calculated correctly
- [ ] Run seed script and verify data in DB
- [ ] Integration tests: notifications system
- [ ] Integration tests: messages (team chat + DM)
- [ ] Integration tests: highlights form + like count
- [ ] Integration tests: follow button
- [ ] Integration tests: MOTM voting
- [ ] Integration tests: match invitations
- [ ] Integration tests: points and rating calculation
- [ ] Full system test report

## Score Double-Validation + MOTM + Rating Budget

- [ ] Schema: add scoreSubmittedA, scoreSubmittedB, scoreBTeamA, scoreBTeamB, scoreConflict, scoreConflictCount to matches
- [ ] Backend: submitScore route (captain submits their version of score)
- [ ] Backend: if both scores match → match completed, points awarded, MOTM + rating phase opens
- [ ] Backend: if scores conflict → match null (no points), notification to both captains, 2nd chance
- [ ] Backend: if 2nd attempt also conflicts → match null permanently, notification
- [ ] Backend: MOTM vote route (both teams vote, any player from either team)
- [ ] Backend: MOTM result = player with most votes, revealed after all votes submitted
- [ ] Backend: rating with budget (captain has totalBudget = avgScore * numPlayers, must distribute all)
- [ ] Backend: rating budget prevents 10 to everyone (budget enforced server-side)
- [ ] Frontend: post-match screen with score form, MOTM vote, rating sliders with budget counter
- [ ] Frontend: score conflict notification + retry form
- [ ] Frontend: MOTM results reveal after all votes submitted
- [ ] Frontend: rating budget display (remaining points shown live)

## Bug Fixes v3 (Session 3)

- [x] Fix notifications : son (expo-haptics) + navigation vers la bonne page au clic
- [x] Fix équipe : joueur peut quitter son équipe (bouton "Leave Team" dans team/[id].tsx)
- [x] Fix équipe : capitaine peut supprimer l'équipe (bouton "Delete Team" dans team/[id].tsx)
- [x] Fix capitaine auto-joint son propre match à la création (sans passer par Join Match)
- [x] Fix capitaine ne peut pas rejoindre sa propre équipe via Join Match
- [x] Fix points : calculés pour tous les joueurs approuvés (pas seulement capitaines)
- [x] Fix refresh automatique : refetchOnWindowFocus sur Home, Matches, Leaderboard, Profile, Match Detail
- [x] Fix clavier : KeyboardAvoidingView sur create-team, profile modals, post-match
- [x] Fix highlight crop : 9:16 portrait dans upload-highlight.tsx

## Écran Défis Ouverts (Open Challenges)

- [x] Schema : table `challenges` (id, teamId, city, format, message, status, matchId, createdAt)
- [x] Backend : route challenge.create (capitaine crée un défi public)
- [x] Backend : route challenge.list (feed filtré par ville/format/statut)
- [x] Backend : route challenge.accept (capitaine adverse accepte → crée un match confirmed)
- [x] Backend : route challenge.cancel (capitaine annule son propre défi)
- [x] Frontend : écran Défis Ouverts (onglet dans la nav principale)
- [x] Frontend : feed de défis avec filtres ville + format
- [x] Frontend : carte défi (équipe, ville, format, message, date)
- [x] Frontend : bouton "Lancer un Défi" (modal formulaire)
- [x] Frontend : bouton "Accepter" (capitaine adverse)
- [x] Frontend : notification au créateur quand son défi est accepté
- [x] Frontend : badge "Mon Défi" sur les défis créés par l'utilisateur
- [x] Icône onglet dans icon-symbol.tsx

## Écran Détail Équipe Enrichi

- [x] Backend : route team.stats (totalMatches, wins, losses, draws, goalsScored, goalsConceded, winRate)
- [x] Backend : route team.topPlayer (joueur avec le meilleur rating moyen dans l'équipe)
- [x] Backend : route team.openChallenge (défi ouvert de l'équipe s'il existe)
- [x] Frontend : section Stats avec cards (Victoires, Nuls, Défaites, Buts, Win Rate)
- [x] Frontend : section Meilleur Joueur (photo, nom, rating moyen, MOTM count)
- [x] Frontend : section Défi Ouvert (si l'équipe a un défi actif → lien vers l'écran Challenges)
- [x] Frontend : améliorer la liste des joueurs avec position + rating

## Écran Recherche Équipes & Joueurs

- [x] Backend : route player.searchByCity (filtre par ville + position)
- [x] Backend : route team.searchByCity (filtre par ville avec stats)
- [x] Frontend : écran Search (onglet dans nav principale)
- [x] Frontend : barre de recherche globale (texte libre)
- [x] Frontend : onglets Teams / Players
- [x] Frontend : filtre par ville (picker)
- [x] Frontend : filtre par position (GK/DEF/MID/ATT) pour joueurs
- [x] Frontend : carte équipe (logo, nom, ville, W/D/L, nb joueurs, bouton Consulter)
- [x] Frontend : carte joueur (photo, nom, position, ville, rating, MOTM, bouton Consulter)
- [x] Frontend : état vide + état chargement

## Système de Localisation (EN/AR/FR)

- [ ] Créer lib/i18n/translations.ts (EN, AR, FR)
- [ ] Créer lib/i18n/LanguageContext.tsx (provider + hook useT)
- [ ] Support RTL pour l'arabe (I18nManager)
- [ ] Persistance de la langue choisie (AsyncStorage)
- [ ] Sélecteur de langue dans Profile Settings
- [ ] Traduire : Home, Matches, Profile, Search, Challenges, Leaderboard
- [ ] Traduire : Match Detail, Team Detail, Player Detail
- [ ] Traduire : notifications, modals, alertes

## Fix Create Match - Supprimer type Public

- [x] Supprimer le type "public" du formulaire Create Match (garder uniquement Friendly)
- [x] Ajouter hint vers l'onglet Challenges pour les matchs publics

## Fix Friendly Match Flow - Accept Direct

- [x] Backend : route match.acceptInvitationDirect (accepte depuis la notif, confirme le match en une étape)
- [x] Backend : après confirmation, notifier tous les joueurs des deux équipes pour rejoindre le match
- [x] Frontend : notifications.tsx - bouton "Accept" inline sur les notifs de type match_invitation
- [x] Frontend : après Accept dans notif, naviguer directement vers le match confirmé
- [x] Frontend : match/[id].tsx - supprimer le double Accept, une seule confirmation suffit

## Fix Bugs v4

- [ ] Fix RTL : désactiver proprement quand langue change AR → EN/FR (forceRTL false + reload)
- [ ] Fix notification capitaine : notif immédiate quand joueur fait demande de join match
- [ ] Fix clavier Login : KeyboardAvoidingView pour que le formulaire reste visible
- [ ] Fix clavier Signup : KeyboardAvoidingView
- [ ] Fix clavier Messages : scroll vers le bas quand clavier s'ouvre
- [ ] Fix clavier Create Match : KeyboardAvoidingView
