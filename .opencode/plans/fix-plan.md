# Fix Plan for Migration Issues (Updated)

## Issues Identified & Solutions

### 1. Players with Missing Club IDs → Free Agents Pool (Transfer Market Only)
**Problem**: ~30 players skipped because their `clubId` from easysbc.io doesn't exist in EA team groups (e.g., Wayne Vaz clubId 132681, Indian Super League teams).

**Solution**: Create a "Free Agents" pseudo-team:
- Team: `eaId: "FREE_AGENTS"`, name: "Agentes Libres"
- Use icon: `https://www.fifacm.com/content/media/imgs/fifa21/teams/256/l111592.png`
- Players with missing clubs get assigned here
- Market value = 0 (free transfer), only contract negotiation
- **Only appears as a filter in transfer market** (NOT in onboarding)

### 2. League Logos → Use Team Logo from That League
**Problem**: `import-leagues-teams.ts` uses first team's `imageUrl` as league logo (shows team logo, not league logo).

**Solution**: 
- Use a representative team logo from each league as the league image
- For leagues with multiple teams, pick a popular/recognizable team's logo
- Fallback: first team's logo if no better option

### 3. "International" Section in Europe
**Problem**: Leagues with `country: "International"` (Liga do Brasil, CSL, Ukrayina Liha, etc.) appear in Europe section.

**Solution**: 
- Fix `LEAGUE_COUNTRY_MAP` - these leagues need proper countries:
  - Liga do Brasil → Brazil (South America)
  - CSL → China (Asia) 
  - Ukrayina Liha → Ukraine (Europe)
  - Liga Azerbaijan → Azerbaijan (Europe/Asia)
  - Thailan League → Thailand (Asia)
  - etc.
- All country/continent names stored in **Spanish**

### 4. All Nationalities/Countries/Continents in English
**Problem**: Country names, continent names all stored/displayed in English.

**Solution**: 
- Create translation maps: `ENGLISH_TO_SPANISH_COUNTRIES` (165), `ENGLISH_TO_SPANISH_CONTINENTS` (6)
- Apply during import and in UI display
- Store Spanish names in DB

### 5. Navigation - Can't Go Back in Onboarding
**Problem**: League selection → Country → League flow doesn't allow back navigation properly.

**Solution**: 
- Fix `league-selection/page.tsx` breadcrumb/step buttons
- Ensure `onClick` handlers for "Cambiar continente/país" work correctly

### 6. Teams Show 0 Players
**Problem**: Rosters not created during player import.

**Solution**: 
- In `import-players.ts`, after creating/updating player, create `Roster` entry linking player → team
- Use `isActive: true`, role based on overall rating
- **No season linkage** (seasonId = null)

### 7. Missing Manager & Budget Display
**Problem**: Team display doesn't show current manager name or budget.

**Solution**: 
- Team model already has `budget` (default 0) ✓
- In team selection API, include `managerProfile` and `manager` relations
- Display in team card: "Manager: {name} | Presupuesto: {budget}€"

### 8. CONMEBOL Teams → Add to Their Domestic Leagues
**Problem**: 40+ CONMEBOL tournament teams missing from regular leagues.

**Solution**: 
- Import CONMEBOL teams (teamGroups 1003 & 1014) as **regular teams**
- Assign to their **respective domestic leagues**:
  - América de Cali, Indep. Medellín, etc. → Liga Colombia
  - Botafogo, etc. → Liga do Brasil
  - Olimpia, etc. → Liga Paraguay (if exists) or appropriate league
- Then link to CONMEBOL tournaments via `TournamentParticipant`

### 9. Missing National Teams (32 FC 27 Nations)
**Problem**: Only 8 NationalTeams created.

**Solution**: 
- Create all 32 NationalTeams from your list with Spanish names:
  - **UEFA (21)**: Alemania, Croacia, Dinamarca, Escocia, España, Finlandia, Francia, Gales, Grecia, Hungría, Inglaterra, Irlanda del Norte, Islandia, Italia, Noruega, Países Bajos, Polonia, Portugal, Rumanía, Suecia, Turquía, Ucrania
  - **CONMEBOL (5)**: Argentina, Brasil, Chile, Perú, Venezuela
  - **AFC/CAF/CONCACAF (6)**: Arabia Saudí, Camerún, Estados Unidos, Ghana, India, Indonesia, Marruecos, México, Qatar, Vietnam
- Use flag URLs: `https://assets.easysbc.io/fc26/countries/{nationID}.png`

---

## Implementation Plan

### Phase 1: Constants & Translations (NEW Files)
1. `src/lib/constants/country-translations.ts` - 165 EN→ES country names
2. `src/lib/constants/continent-translations.ts` - 6 EN→ES continents  
3. `src/lib/constants/national-teams.ts` - 32 FC 27 nations with Spanish names, countryCode, easysbc flag URLs
4. Update `src/lib/constants/league-country-map.ts` - Fix all mappings, use Spanish

### Phase 2: Import Scripts Updates
1. **`scripts/import-countries.ts`**
   - Use Spanish country names from translations
   - Create Country with flagUrl from easysbc.io: `https://assets.easysbc.io/fc26/countries/{nationID}.png`
   - Create ALL 32 NationalTeams with Spanish names

2. **`scripts/import-leagues-teams.ts`**
   - Import CONMEBOL teams (1003, 1014) as regular teams in their domestic leagues
   - Use Spanish country/continent names
   - League imageUrl = representative team logo from that league
   - Mark women's leagues as non-playable

3. **`scripts/import-tournaments.ts`**
   - Create CONMEBOL Libertadores/Sudamericana tournaments
   - Link teams that now exist in DB

4. **`scripts/import-players.ts`**
   - Create "Agentes Libres" pseudo-team (eaId: "FREE_AGENTS")
   - For each player: create Roster entry (isActive: true, no seasonId)
   - Players with missing clubId → assign to Free Agents team
   - Use Spanish position translations
   - Nationality flag: `https://assets.easysbc.io/fc26/countries/{nationID}.png`

### Phase 3: API & UI Fixes
1. **`src/app/api/leagues/[id]/teams/route.ts`** - Include managerProfile, manager, budget
2. **`src/app/onboarding/league-selection/page.tsx`** - Fix back navigation buttons
3. **`src/app/onboarding/team-selection/page.tsx`** - Show manager + budget on team cards
4. **Transfer Market** - Add "Agentes Libres" filter for free agent players

### Phase 4: Verification
1. Run full migration: `npx prisma db seed`
2. Build check: `npx next build`
3. Test onboarding flow

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/constants/country-translations.ts` | **NEW** - 165 country EN→ES |
| `src/lib/constants/continent-translations.ts` | **NEW** - 6 continent EN→ES |
| `src/lib/constants/national-teams.ts` | **NEW** - 32 FC 27 nations with Spanish names |
| `src/lib/constants/league-country-map.ts` | **MODIFY** - Fix mappings, use Spanish names |
| `scripts/import-countries.ts` | **MODIFY** - Spanish names, all NationalTeams, easysbc flags |
| `scripts/import-leagues-teams.ts` | **MODIFY** - CONMEBOL teams to domestic leagues, team logos for leagues |
| `scripts/import-tournaments.ts` | **MODIFY** - Link existing CONMEBOL teams |
| `scripts/import-players.ts` | **MODIFY** - Free Agents team, Rosters (no season), missing clubs handling |
| `src/app/api/leagues/[id]/teams/route.ts` | **MODIFY** - Include manager + budget |
| `src/app/onboarding/league-selection/page.tsx` | **MODIFY** - Fix back navigation |
| `src/app/onboarding/team-selection/page.tsx` | **MODIFY** - Show manager + budget |

---

## Clarifications Applied

| Item | Decision |
|------|----------|
| CONMEBOL teams | Add to their domestic leagues |
| Free Agents UI | Filter in transfer market only |
| Nationality flags | `https://assets.easysbc.io/fc26/countries/{nationID}.png` |
| Rosters | No season linkage (seasonId = null) |
| League logos | Representative team logo from that league |
| Budget | Default 0€ (already in schema) |

---

## Success Criteria

- ✅ All ~16,400 players imported (including free agents)
- ✅ 51 leagues with correct country/continent/**Spanish names**
- ✅ League logos = team logo from that league
- ✅ 32 NationalTeams with **Spanish names** and easysbc flags
- ✅ Team cards show manager + budget (0€ default)
- ✅ Rosters populated → teams show correct player counts
- ✅ Onboarding navigation works (back/forward)
- ✅ "International" section removed from Europe
- ✅ CONMEBOL teams in domestic leagues + tournaments
- ✅ Free Agents filter in transfer market
- ✅ Build passes, no TypeScript errors