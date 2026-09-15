# Admin GitHub page redesign — Design

- **Date:** 2026-09-15
- **Route:** `/admin/github` (admin-only, behind Supabase Auth)
- **Status:** Approved in brainstorming, pending spec review

## 1. Summary

Rebuild the admin GitHub page around one question: **"how consistent is my work?"**
The page gets a range filter (7d / 30d / 90d / 12m) that drives every number on
screen, a hero consistency figure, a full-width activity calendar, a recent
activity feed (commits, pull requests, new repos and releases), a detail column
(commits per repo, weekday distribution, languages) and a repositories table.

All activity numbers derive from **a single data source** — the default-branch
commit history of every owned repository, private ones included — so they
always agree with each other.

## 2. Goals and non-goals

### Goals
- Consistency is the first thing visible (hero figure + calendar).
- Show the latest commits and pull requests, including private repositories.
- One range filter scopes the whole page; the range lives in the URL.
- Every number on the page is internally consistent for the selected range.
- Fix the design, accessibility, data and performance defects listed in §3.
- Keep data derivation separate from presentation so parts can later be reused
  on the public portfolio by filtering on `isPrivate`.

### Non-goals
- Coolify deployments in the feed (would need a new Coolify API secret).
- Public-portfolio integration (only prepared for, not built).
- Commits on non-default branches, or contributions to repositories not owned
  by the user.
- Enabling Next.js Cache Components app-wide.
- Changing `/api/github/activity`, the public `ActivityGraph`, or `DispatchButton`.

## 3. Defects in the current page (all fixed by this design)

| Area | Defect |
|---|---|
| Copy | "1 días" — no singular/plural handling |
| Data | "+100% vs semana pasada" is forced when last week had 0 commits |
| Layout | Top-3 repos card clips the language badge and overlaps columns (fixed `lg:h-56`); duplicates the table below |
| Data viz | Weekday chart rotates labels (Mar…Lun) and sums the whole year under a "per day" title |
| Data viz | Language donut with one 96.7% slice compares nothing |
| Data viz | Area chart with `monotone` interpolation invents peaks on sparse daily data; dashed grid; a single "ene" x-axis label |
| Hierarchy | Eight KPI tiles with equal weight; stars/forks/issues (3/0/0) as prominent as real activity |
| Data | "Commits totales 276" (all-time default branch) sits next to contribution-based metrics that measure something else |
| A11y | Sortable headers are `<th onClick>`: no keyboard support, no `aria-sort`, no visible focus |
| A11y | `gray-500` (4.02:1) used for small text and `gray-600` (2.57:1) for table headers and percentages on `#0d0d0d` |
| Perf | The page fetches its own `/api/github/activity` over HTTP via `NEXT_PUBLIC_APP_URL` |
| Perf | Languages fetched twice per repo (~2N+2 GitHub requests per visit), all `no-store` |
| Perf | `export const revalidate = 300` has no effect (dynamic route); `<Suspense>` boundaries never stream because all data is awaited at the top |
| Errors | `error.tsx` shows the raw technical error message |

## 4. Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Audience | Admin-only now, parts may go public later | Show private data; keep derivation reusable |
| D2 | Page priority | Consistency over time | User's main question when opening the page |
| D3 | Period | Range filter with presets in the URL, default `12m` | The year view gives the best overview; 30d, 90d and 7d stay one click away (changed from `30d` after reviewing the live page) |
| D4 | Feed content | Commits, pull requests, new repositories and releases | Coolify deployments excluded (new secret, scope) |
| D5 | Data source | Default-branch commit history of owned repos (GraphQL) | `contributionsCollection` hides private repos as "restricted" (174 of 227 in 12 months) and its totals disagree with the history (10 vs 15 in 30 days) |
| D6 | Layout | Option A: hero + full-width calendar, feed (2/3) + detail (1/3), repo table last | Only option with a clear hierarchy for D2 |
| D7 | Feed type encoding | Distinct icon shapes in neutral gray + written state | Cyan/violet/gray failed the normal-vision floor (ΔE 14.3 < 15) |

Measured facts that shaped the design (2026-09-15): 232 default-branch commits
in 12 months (celiamunozfisio.com 130, sebascm-dev.me 56,
condadopadelacademy.com 45, sebascm-dev 1), ~3 pages of 100; one GraphQL query
~1 s; 2 pull requests (merged); 0 releases and 0 tags; 1 repository created in
12 months; the Events API excludes private activity and commit lists; the
fine-grained token reads private repository history.

## 5. Page layout

Top to bottom (desktop ≥ 1024px):

1. **Header:** breadcrumb, `h1` "GitHub", subtitle.
2. **Filter row:** range segmented control (left); "Actualizado hace X" and
   the refresh button (right).
3. **Hero row (4 columns, 1.7fr 1fr 1fr 1fr):** hero tile "Commits · <range>",
   then "Racha actual", "Días activos", "Repos con commits".
4. **Activity calendar**, full width.
5. **Two columns (1.6fr / 1fr):**
   - left: **Actividad reciente** feed;
   - right, stacked: **Commits por repo**, **Por día de la semana**, **Lenguajes**.
6. **Repositorios** table, full width.

Responsive:
- `< 640px`: single column; hero tiles in a 2×2 grid with the hero spanning
  both columns; the calendar scrolls horizontally with weekday labels fixed.
- `640–1023px`: hero row 2×2; feed and detail stacked.
- The page never scrolls horizontally; only the calendar and the table do,
  inside their own containers.

## 6. Data architecture

### 6.1 Modules (`src/lib/github/`, server-only unless noted)

| Module | Responsibility |
|---|---|
| `types.ts` | Shared types (`Commit`, `PullRequest`, `RepoSummary`, `FeedItem`, `ActivitySummary`, `RangeKey`) — importable from client components |
| `range.ts` | Parse `?range`, compute current and previous windows (pure) |
| `client.ts` | GraphQL `fetch` with caching and typed errors; resolves `viewer { id login }` once (cached 24 h, same tag) for the author filter |
| `queries.ts` | Activity query (range-dependent) and repositories query (range-independent), including pagination |
| `activity.ts` | Pure derivations from `Commit[]` (§7) |
| `format.ts` | `Intl` helpers: relative time, numbers, dates, plural forms (pure) |

`src/lib/github.server.ts` keeps only `dispatchWorkflow` (used by the dispatch
API route). `fetchReposWithStats`, `fetchLanguageBreakdown` and the types only
the old components use are removed.

### 6.2 Range windows (`range.ts`)

- Accepted values: `7d`, `30d`, `90d`, `12m`. Missing or invalid → `12m`.
  The default is not written to the URL.
- Day boundaries use the **`Europe/Madrid`** time zone.
- Current window: the last N calendar days ending today (inclusive);
  `12m` = the last 365 days.
- Previous window: the N days immediately before the current window.
- Queries fetch history `since` the start of the previous window.

### 6.3 Queries (`queries.ts`)

**Activity query** — range-dependent, feeds hero, calendar, feed and detail:
- Owned repositories (`ownerAffiliations: OWNER`) with `isPrivate`, `name`,
  `url`, `createdAt`, default branch name and
  `history(since, author: { id: viewerId }, first: 100, after)` — `viewerId` from
  `client.ts` — returning
  `oid`, `committedDate`, `messageHeadline`, `url`, `additions`, `deletions`.
  Paginate each repository until `hasNextPage` is false; repositories paginate
  in parallel.
- Pull requests authored by the user updated since the previous window start
  (search `author:<login> is:pr updated:>=<date>`): title, number, url, state,
  `isDraft`, `createdAt`, `mergedAt`, `closedAt`, repository name and
  `isPrivate`.
- Releases per repository (`publishedAt`, `tagName`, `name`, `url`).
- Returns `fetchedAt` (ISO string) with the payload.
- A failure in any page is an error for the whole query: partial counts are
  never shown silently.

**Repositories query** — range-independent, feeds languages and the table:
- Per repository: `name`, `description`, `url`, `isPrivate`,
  `primaryLanguage`, `languages(first: 10) { edges { size node { name } } }`,
  `stargazerCount`, `forkCount`, `issues(states: OPEN) { totalCount }`,
  `pushedAt`, all-time default-branch `history { totalCount }`.
- Replaces every REST `/languages` call.

### 6.4 Caching and refresh

- `client.ts` calls GraphQL with
  `fetch(url, { method: 'POST', next: { revalidate: 300, tags: ['github'] } })`.
  In Next.js 16, `fetch` caches POST requests with an `Authorization` header when
  opted in; the cache key includes method, headers and body, so each range is
  cached separately. `unstable_cache` is not used (replaced in Next.js 16).
- **Refresh:** Server Action `refreshGithub()` in
  `src/app/(admin)/admin/github/actions.ts`: `requireAdmin()` first, then
  `updateTag('github')`. `updateTag` is only valid inside Server Actions and gives
  read-your-own-writes semantics.
- "Actualizado hace X" is derived from the payload's `fetchedAt`.

### 6.5 Rendering

- `page.tsx`: `await requireAdmin()`, `const { range } = await searchParams`,
  parse the range, render the header and the filter row, then two independent
  `<Suspense>` boundaries:
  - `ActivitySection` (activity query → hero, calendar, feed, detail);
  - `ReposSection` (repositories query → languages, table).
- Each boundary renders a skeleton with the exact final dimensions on first
  load, and its own error card if its query fails (§9).
- **Range change:** `RangeFilter` (client) calls `router.replace('?range=…',
  { scroll: false })` inside `startTransition`. While pending, the content below
  the filter keeps the previous render at 60% opacity (shared via a small client
  context wrapping the sections). No skeleton flash.
- Server components render only; all logic lives in `activity.ts`, `range.ts`
  and `format.ts`.

## 7. Derivations (`activity.ts`)

All functions are pure and take `Commit[]` plus the range windows.

| Output | Definition |
|---|---|
| Daily buckets | One entry per day of the current window (Madrid time), zero-filled |
| Commits in range | Count of commits in the current window |
| Delta | `(current − previous) / previous`, rounded. When `previous = 0` → `null`, rendered as "Sin commits en el periodo anterior" |
| Sparkline | Points per range: 7d → 7, 30d → 10, 90d → 13, 12m → 12. Bucket length = `ceil(windowDays / points)` days, aligned to end today; the oldest bucket may be shorter |
| Current streak | Consecutive days with ≥ 1 commit ending today; if today has 0 commits, count ending yesterday (today does not break the streak) |
| Best streak | Longest run of consecutive active days within the current window |
| Active days | Days in the current window with ≥ 1 commit, plus the share of the window |
| Repos with commits | Repositories with ≥ 1 commit in the window, out of total owned |
| Per repo | Commit count per repository in the window, descending, zero-count repos omitted |
| Weekday | Counts per weekday Monday → Sunday for the window |
| Feed | Commits, pull requests (one item per PR, dated by its latest event in the window: merged > closed > opened), releases and repositories created, all within the window, sorted by date descending; at most 50 items passed to the client |

**Invariant:** for any input, `sum(daily buckets) === commits in range ===
sum(per repo) === sum(weekday)`.

## 8. Components (`src/app/(admin)/admin/github/_components/`)

| Component | Type | Notes |
|---|---|---|
| `RangeFilter` | client | `role="radiogroup"`, arrow-key navigation, visible focus, pending state |
| `RefreshButton` | client | Calls `refreshGithub`; disabled with "Actualizando…" while pending |
| `ActivityHero` | server | Label "Commits · últimos 30 días", value (Fira Sans semibold, proportional figures), delta with arrow + text (never color alone), sparkline (gray with the current segment in accent, end dot with a 2px surface ring) |
| `StatTile` | server | Label / value / caption; used for streak, active days, repos |
| `ActivityCalendar` | client | 30d/90d/12m: week-column heatmap with weekday and month labels, legend "Menos … Más"; 7d: seven columns with day labels. Each cell is focusable and shows the same tooltip on hover and focus (value first, then the date). A "Ver como tabla" toggle renders an accessible table of active days |
| `ActivityFeed` | client | Shows 10 items, "Ver más" adds 10; icon shape per type (commit, pull request, repository, release) in `gray-400`; message truncated with an ellipsis and full text in `title`; meta line `repo · branch · short sha · relative time · +adds −dels`; lock icon for private repos; PR state written ("Fusionada", "Abierta", "Cerrada", "Borrador"); each item links to GitHub |
| `RepoBreakdown` | server | Thin horizontal bars (≤ 10px, 4px rounded end), single accent color, value written on every row, lock icon for private repos |
| `WeekdayChart` | server | Columns ≤ 14px wide, Monday → Sunday, only the maximum labeled, visually hidden list with every value |
| `LanguageBar` | server | Stacked bar with 2px gaps; top language in accent, the rest in grays; name and percentage always visible; caption "No depende del rango" |
| `RepoTable` | client | Sort controls are `<button>`s inside `<th>` with `aria-sort`; `tabular-nums`; lock icon next to the name instead of a "Privado" column; columns: repositorio, lenguaje, commits (rango), total, último push, issues ("—" when 0), estrellas |
| `ActivitySection` / `ReposSection` | server | Fetch + compose; no logic |
| `SectionSkeleton` | server | Exact final dimensions |
| `SectionError` | server | Message with a next step + retry |

Old components removed: `SummaryStats`, `ActivityMetrics`,
`ContributionsChart`, `TopReposCard` and `LanguageBreakdown`. `WeekdayChart.tsx`
is rewritten in place. `repos/_components/RepoTable.tsx` is replaced by
`github/_components/RepoTable.tsx`; `repos/page.tsx` keeps redirecting to
`/admin/github`, and `repos/_components/DispatchButton.tsx` stays untouched.

## 9. States and error handling

| State | Behavior |
|---|---|
| First load | Per-section skeleton with final dimensions |
| Range change | Previous content at 60% opacity until the new render arrives |
| Empty range | "Sin commits en los últimos N días" and a button to the next wider range (hidden on `12m`). If the previous window has commits, add "Tu último commit fue el <date>" from that window; otherwise omit the sentence |
| No pull requests / releases | Those item types are simply absent; the feed never shows empty headings |
| GitHub auth error (401/403 bad credentials) | "El token de GitHub no es válido o caducó. Renuévalo en Coolify (`GITHUB_TOKEN`)." + retry |
| Rate limited | "GitHub ha limitado las peticiones. Vuelve a intentarlo en unos minutos." + retry |
| Other failure | "No se pudo cargar GitHub." + retry |
| Route-level `error.tsx` | Same friendly copy; never renders `error.message` |

Errors are typed in `client.ts` (`GithubAuthError`, `GithubRateLimitError`,
`GithubUnavailableError`) and mapped to copy in `SectionError`. Server logs keep
the technical detail.

## 10. Visual system

- **Calendar ramp** (ordinal, dark, validated with the dataviz validator against
  `#0d0d0d`, all checks pass): `#11606d`, `#0e8394`, `#17aec2`, `#22d3ee`.
  Empty day: `#1a1a1a`.
- **Text on `#0d0d0d`:** primary `#ffffff` / `gray-200` (15.7:1); secondary
  `gray-400` (7.66:1); `gray-500` (4.02:1) only for large text; `gray-600` is
  not used for text.
- **Accent:** `#22d3ee` for marks, the active segment, focus rings and the
  current sparkline segment. Text never uses a data color.
- **Delta colors:** up `emerald-400`, down `red-400`, always with an arrow and text.
- **Typography:** Fira Sans for UI and figures (proportional); Fira Code for
  repository names, commit messages and SHAs; `tabular-nums` only in the table.
- **Marks:** bars and columns with 4px rounded data ends and square baselines;
  lines 2px; solid hairline grids only where needed; no dashed rules.
- **Interaction:** visible 2px accent focus ring on every interactive element;
  transitions 150–200ms on color and opacity only; `prefers-reduced-motion`
  disables non-essential motion; clickable elements use `cursor-pointer`.
- Recharts is no longer used on this page (it stays in the project for other pages).

## 11. Testing

Strict TDD: every test is written first and seen failing.

1. **Pure logic** (`range.ts`, `activity.ts`, `format.ts`): presets and invalid
   input; current/previous windows; Madrid day boundaries (a commit at 00:30
   local counts for that local day); zero-filled buckets; current streak with
   and without commits today; best streak; active days; per repo; weekday
   Monday → Sunday; delta including `previous = 0`; feed merge, ordering, PR
   latest-event rule and the 50-item cap; plural forms.
2. **Invariant test:** generated commit sets satisfy
   `sum(buckets) === total === sum(per repo) === sum(weekday)`.
3. **Data layer** (`fetch` mocked with `vi.stubGlobal`): pagination across
   pages, private repositories kept, cache options (`revalidate: 300`,
   `tags: ['github']`), typed errors for 401/403/rate limit, failure on any page
   fails the query.
4. **Server Action:** `refreshGithub` does not call `updateTag` when
   `requireAdmin` redirects; calls `updateTag('github')` for the admin.
5. **Client components** (Testing Library): `RangeFilter` keyboard navigation and
   URL update; `RepoTable` sorting and `aria-sort`; `ActivityFeed` "Ver más";
   `ActivityCalendar` focus tooltip and table view; empty and error copy.
6. **Retired tests:** `fetchReposWithStats` and `fetchLanguageBreakdown` tests
   are removed with those functions. `processGithubEvents` tests stay untouched.
7. **End-to-end verification** (not automated): `next start` locally with the
   real token; for each range, check that the HTML numbers agree (12m shows the
   same total in hero, calendar sum and per-repo sum); screenshots at 375, 768
   and 1440px; full keyboard pass; production build, typecheck and lint green.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Commits on unmerged branches are not counted | Documented limitation (D5); the feed labels the branch |
| 12m range with the previous window fetches ~24 months of history | Measured at ~232 commits per 12 months (~5–6 pages); cached for 5 minutes per range |
| GraphQL rate limit (5,000 points/hour) | Caching per range; manual refresh only |
| Commits authored with an email not linked to the GitHub account are dropped by the author filter | Accept; all measured commits resolve to `sebascm-dev` |
| Data Cache stores private repository metadata on the server | Server-only cache inside the admin deployment; no client exposure |
