# FC 27 Database Migration Plan

## Overview
Complete database rebuild using two new data sources:
1. **EA Ratings JSON** → Leagues, Teams, Countries/Nationalities (metadata + images)
2. **easysbc.io API** → Players (with matching IDs for leagues/teams/countries)

---

## Data Sources Analysis

### EA Ratings JSON Structure
```
pageProps.auxData.defaultLocaleFilters:
├── teamGroups[64]          # Leagues with teams
│   ├── id: "53"
│   ├── label: "LALIGA EA SPORTS"
│   └── teams[]: { id: 243, label: "Real Madrid", imageUrl: "...", isPopular: true }
├── nationality[200+]        # Countries
│   ├── id: 45, label: "Spain", imageUrl: "...", isPopular: true
└── (positions, abilities, iterations)
```

### easysbc.io API Structure
```
GET /players?v2&page=1&sort-rating&league=53
{
  "players": [{
    "resourceId": 231747,
    "name": "Kylian Mbappé",
    "rating": 91,
    "positions": ["ST", "LW"],
    "possiblePositions": ["ST", "LW"],
    "attributes": [96, 91, 80, 92, 29, 76],  // pace, shooting, passing, dribbling, defending, physical
    "countryId": 18,       // matches EA nationality.id
    "leagueId": 53,        // matches EA teamGroups.id
    "clubId": 243,         // matches EA teamGroups.teams.id
    "playerUrl": "https://assets.easysbc.io/fc27/players/ea/231747.png",
    "skillMoves": 5,
    "weakFoot": 4,
    "preferredFoot": "Right",
    ...
  }],
  "total": 500,
  "pages": 25
}
```

---

## Migration Steps

### Phase 0: Preparation
- [ ] Backup current database (optional - will truncate specific tables)
- [ ] Create position translation map (EN → ES)
- [ ] Create league → country mapping (64 leagues)
- [ ] Create league → continent mapping

### Phase 1: Database Cleanup
**Tables to TRUNCATE (preserving user auth):**
```sql
-- Preserve: User, Account, Session, VerificationToken, CareerGroup, CareerGroupMember, EmailMessage
-- Truncate:
TRUNCATE TABLE 
  "RatingSnapshot",
  "MatchStat", 
  "MatchEvent",
  "Match",
  "TournamentParticipant",
  "TournamentStageDependency",
  "TournamentStage",
  "Tournament",
  "Season",
  "Roster",
  "Transfer",
  "Player",
  "Manager",
  "Team",
  "League",
  "NationalTeam",
  "Country"
RESTART IDENTITY CASCADE;
```

### Phase 2: Import Countries & NationalTeams
**Source:** EA JSON `nationality[]`
**Map to:**
- `Country` table (for player nationality relation)
- `NationalTeam` table (playable national teams with flagUrl)

### Phase 3: Import Leagues
**Source:** EA JSON `teamGroups[]`
**Map to:** `League` table
**Required mapping:** leagueId → { country, continent }

### Phase 4: Import Teams
**Source:** EA JSON `teamGroups[].teams[]`
**Map to:** `Team` table with `leagueId` relation

### Phase 5: Import Players
**Source:** easysbc.io API (paginated, ~21,000 players)
**Process:**
- Iterate all leagues (64 teamGroups)
- For each league, fetch all pages of players
- Map attributes array → individual stats
- Translate positions EN → ES
- Link to Country (nationalityId), League (leagueId), Team (clubId)

---

## Position Translation Map (EN → ES)

| English | Spanish | Notes |
|---------|---------|-------|
| GK | POR | Portero |
| CB | DFC | Defensa Central |
| LB | LI | Lateral Izquierdo |
| RB | LD | Lateral Derecho |
| LWB | EI | Extremo Izquierdo (or Carrilero) |
| RWB | ED | Extremo Derecho |
| CDM | MCD | Mediocentro Defensivo |
| CM | MC | Mediocentro |
| CAM | MCO | Mediocentro Ofensivo |
| LM | MI | Medio Izquierdo |
| RM | MD | Medio Derecho |
| LW | EI | Extremo Izquierdo |
| RW | ED | Extremo Derecho |
| CF | DC | Delantero Centro |
| ST | DC | Delantero Centro |

**Preferred position logic:** Use `preferredPosition` as primary, `positions[]` as alternatives

---

## League → Country Mapping (64 leagues)

| leagueId | League Name | Country | Continent |
|----------|-------------|---------|-----------|
| 53 | LALIGA EA SPORTS | Spain | Europe |
| 54 | LALIGA HYPERMOTION | Spain | Europe |
| 13 | Premier League | England | Europe |
| 14 | EFL Championship | England | Europe |
| 60 | EFL League One | England | Europe |
| 61 | EFL League Two | England | Europe |
| 19 | Bundesliga | Germany | Europe |
| 20 | Bundesliga 2 | Germany | Europe |
| 2076 | 3. Liga | Germany | Europe |
| 31 | Serie A Enilive | Italy | Europe |
| 32 | Serie BKT | Italy | Europe |
| 16 | Ligue 1 McDonald's | France | Europe |
| 17 | Ligue 2 BKT | France | Europe |
| 10 | Eredivisie | Netherlands | Europe |
| 4 | 1A Pro League | Belgium | Europe |
| 308 | Liga Portugal | Portugal | Europe |
| 65 | SSE Airtricity PD | Ireland | Europe |
| 50 | Scottish Prem | Scotland | Europe |
| 1 | 3F Superliga | Denmark | Europe |
| 80 | Ö. Bundesliga | Austria | Europe |
| 41 | Eliteserien | Norway | Europe |
| 56 | Allsvenskan | Sweden | Europe |
| 189 | Brack Super League | Switzerland | Europe |
| 68 | Trendyol Süper Lig | Turkey | Europe/Asia |
| 66 | PKO Bank Polski Ekstraklasa | Poland | Europe |
| 330 | SUPERLIGA | Romania | Europe |
| 319 | Česká Liga | Czech Republic | Europe |
| 351 | Isuzu UTE A League | Australia | Asia/Oceania |
| 83 | K League 1 | South Korea | Asia |
| 350 | ROSHN Saudi League | Saudi Arabia | Asia |
| 39 | Major League Soccer | USA | North America |
| 353 | Liga Profesional de Fútbol | Argentina | South America |
| 341 | Liga BBVA MX | Mexico | North America |
| 2209 | Liga Colombia | Colombia | South America |
| 1003 | CONMEBOL Libertadores | International | South America |
| 1014 | CONMEBOL Sudamericana | International | South America |
| 317 | Liga Hrvatska | Croatia | Europe |
| 322 | Finnliiga | Finland | Europe |
| 2211 | Magyar Liga | Hungary | Europe |
| 2244 | Liga Azerbaijan | Azerbaijan | Europe/Asia |
| 2249 | Liga Chile | Chile | South America |
| 63 | Hellas Liga | Greece | Europe |
| 2210 | Liga Cyprus | Cyprus | Europe |
| 2271 | Thailand League | Thailand | Asia |
| 2272 | Norge Kvinner Liga | Norway | Europe |
| 2273 | Ísland Kvennadeild | Iceland | Europe |
| 2274 | Liga Bulgaria | Bulgaria | Europe |
| 2149 | ISL | India | Asia |
| 2172 | United Emirates League | UAE | Asia |
| 2216 | Barclays Women's Super League | England | Europe |
| 2218 | Arkema Première Ligue | France | Europe |
| 2221 | NWSL | USA | North America |
| 2222 | Liga F Moeve | Spain | Europe |
| 2228 | Liga Portugal Feminino | Portugal | Europe |
| 2229 | Nederland Vrouwen Liga | Netherlands | Europe |
| 2230 | Ceska Liga Žen | Czech Republic | Europe |
| 2231 | Schweizer Damen Liga | Switzerland | Europe |
| 2232 | Sverige Liga | Sweden | Europe |
| 2233 | Scottish Women's League | Scotland | Europe |
| 2236 | Calcio A Femminile | Italy | Europe |
| 2267 | Liga do Brasil | Brazil | South America |

---

## Attributes Array Mapping

easysbc.io `attributes: [96, 91, 80, 92, 29, 76]` maps to:
```
[0] → pace (Ritmo)
[1] → shooting (Tiro)
[2] → passing (Pase)
[3] → dribbling (Regate)
[4] → defending (Defensa)
[5] → physical (Físico)
```

---

## Implementation Files to Create/Modify

### New Files:
1. `scripts/fetch-ea-catalog.ts` - Download & parse EA JSON for leagues/teams/countries
2. `scripts/import-leagues-teams.ts` - Import leagues & teams with country mapping
3. `scripts/import-countries-nationalteams.ts` - Import countries & national teams
4. `scripts/import-players-easysbc.ts` - Import players from easysbc.io with position translation
4. `src/lib/constants/league-country-map.ts` - League ID → {country, continent}
5. `src/lib/constants/position-translation.ts` - EN → ES position map

### Modified Files:
1. `src/lib/catalog/importEaCatalog.ts` - **REPLACE** with new import logic
2. `src/lib/ratings/eaClient.ts` - **REPLACE** with easysbc.io client
3. `prisma/seed.ts` - Update to run new import scripts

### API Routes to Update:
1. `src/app/api/leagues/route.ts` - Should work with new data
2. `src/app/api/leagues/[id]/teams/route.ts` - Should work
3. `src/app/api/national-teams/route.ts` - Should work

---

## Execution Order

```bash
# 1. Clear database (keep auth tables)
npx prisma db execute --file scripts/cleanup.sql

# 2. Run new seed
npx prisma db seed  # Updated to run new import scripts
```

---

## Clarifying Questions

1. **Women's leagues**: Import women's leagues (teamGroups 2216, 2218, 2221, 2222, 2228, 2229, 2230, 2231, 2232, 2233, 2236) or only men's?
2. **International tournaments**: CONMEBOL Libertadores/Sudamericana (teamGroups 1003, 1014) - import as leagues or skip?
3. **Player volume**: ~21,000 players. Batch size? Rate limits on easysbc.io?
4. **NationalTeam vs Country**: Both needed? NationalTeam for playable national teams with managers?
5. **Existing users**: Reset their clubTeamId/nationalTeamId after import?
6. **Attributes confirm**: Is `[pace, shooting, passing, dribbling, defending, physical]` correct order?

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| easysbc.io rate limits | Add delays between requests, implement retry logic |
| ID mismatches | Validate all IDs match between EA JSON and easysbc.io |
| Missing league country | Manual mapping file for 64 leagues |
| Position translation gaps | Log unknown positions, default to "MC" |
| Large import time | Parallel league processing, batch DB writes |

---

## Success Criteria

- [ ] All 64 leagues imported with correct country/continent
- [ ] All teams imported with correct leagueId
- [ ] All countries imported with flag URLs
- [ ] NationalTeams created for playable nations
- [ ] ~21,000 players imported with correct stats, positions (ES), images
- [ ] Onboarding flow works: Profile → League → Team → National Team
- [ ] No duplicate entries on re-run