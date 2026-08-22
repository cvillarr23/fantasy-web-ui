# Copilot Instructions for fantasy-web-ui

## Project Overview

**fantasy-web-ui** is a React/TypeScript application for monitoring and manually intervening in automated fantasy football draft operations. It consumes the `/v1/draft/*` API from `fantasy-core-pipeline` and provides:

- **Draft Day view**: Live pick feed, recommendation panel, pause/resume controls
- **Practice Draft view**: Practice room URL input, league/team config, same draft dashboard reused
- **Intervention toggle** for practice mode: hides intervention controls for hands-off test runs

## Key Architecture

### Build & Test

- **Lint**: `npm run lint` (oxlint)
- **Type check**: `npx tsc -b --noEmit`
- **Build**: `npm run build` (Vite)
- **Dev server**: `npm run dev`
- **No test framework exists** — validation is manual + CI checks above

### Component Hierarchy

```
App.tsx (main router/state manager)
├── ConfigScreen.tsx (live draft config: league ID, team ID, season)
├── PracticeDraftScreen.tsx (practice room URL → league/team/season auto-parse + full dashboard)
│   ├── StatusHeader.tsx (job state, connection health, on-the-clock team)
│   ├── PickFeed.tsx (recent picks, clickable for player summary)
│   ├── RecommendationPanel.tsx (top candidates from draft_matrix.py)
│   └── InterventionControls.tsx (pause/resume, manual pick publish)
└── Dashboard.tsx (reused for both live + practice views)
```

### API Client (`src/api/client.ts`)

Core functions:
- `setDraftConfig(config: DraftConfig)`: `POST /v1/draft/config` with `mode: 'live'|'practice'`
- `startDraftSync(leagueId?: string)`: `POST /v1/draft/start?league_id=...` (optional targeting)
- `getDraftStatus(leagueId, season)`: `GET /v1/draft/status`
- `streamDraftStatus(leagueId, season)`: SSE stream of `/v1/draft/stream`
- Practice-specific:
  - `startPracticeSyncJob(roomUrl)`: `POST /v1/draft/practice/sync-job` (room connector)
  - `getPracticeSyncJobStatus()`: `GET /v1/draft/practice/sync-job/status`
  - `endPracticeSyncJob()`: `DELETE /v1/draft/practice/sync-job`

### Stream Hook (`src/hooks/useDraftStream.ts`)

Maintains real-time draft status via SSE:
- Polls `/v1/draft/stream?league_id=...&season=...`
- Detects stale streams (no update > 15s)
- Only emits when payload actually changes
- **Critical for practice mode**: UI gates all renders to streams where `status.league_id === practiceConfig.league_id && status.season === practiceConfig.season` to avoid rendering stale data from a previous draft

## Issue #6 & #7: Practice Parity Implementation

### Background

**Issue #6**: Accept test run with zero intervention (manual verification)
**Issue #7**: Full Draft Day parity in practice mode (live picks, recommendations, optional interventions)

### What's Implemented (Issue #7)

1. **Type support**: Added `mode: 'live'|'practice'` to `DraftConfig` in `src/api/types.ts`

2. **Backend targeting**: Updated `startDraftSync(leagueId?: string)` to send `?league_id=...` so practice and live drafts can run independently

3. **Practice screen flow** (`src/components/PracticeDraftScreen.tsx`):
   - Room URL input + auto-parse league/team/season from query params
   - Collect manual league/team/season inputs
   - Start sequence: `startPracticeSyncJob()` → `setDraftConfig({ mode: 'practice' })` → `startDraftSync(leagueId)`
   - Immediately persist config/tracking state after sync job starts (so End controls exist even if later steps fail)
   - If config/sync fails, repolls backend status so partial startup is visible
   - Reuse exact same Dashboard components (`StatusHeader`, `PickFeed`, `RecommendationPanel`, `InterventionControls`)
   - Conditional render: hide `InterventionControls` if toggle is OFF (persisted in localStorage)

4. **Stream validation** (`PracticeDraftScreen` + `useDraftStream`):
   - Only render/use stream data if `status.league_id` and `status.season` match active practice config
   - Prevents stale picks/recommendations from a closed draft appearing in the new one

5. **API mode defaults**:
   - `ConfigScreen` saves `mode: 'live'` when user configures (live draft)
   - `App.tsx` backfills legacy stored configs missing `mode` key with `live` default

### Common Issues & Fixes

#### Error: `"DRAFT_SYNC_IMAGE is not configured..."`

**Root Cause**: Backend (`fantasy-core-pipeline` deployment) missing `DRAFT_SYNC_IMAGE` env var

**Fix**: Merge `fantasy-infra` PR that adds `DRAFT_SYNC_IMAGE` to `base/core-pipeline/fastapi-deployment.yaml`, then force-sync K8s:
```bash
kubectl apply -k /path/to/fantasy-infra/overlays/draft-day
kubectl rollout restart deployment/fantasy-core-pipeline -n default
```

Then retry practice draft in UI.

#### No picks appearing after connecting

**Likely causes**:
1. Room sync job created but never connected (check `/v1/draft/practice/sync-job/status`)
2. Draft listener job never started (check backend logs: `kubectl logs -n default deployment/fantasy-core-pipeline`)
3. Stream is stale (`status.league_id` or `status.season` mismatch with active practice config)

**Debug**:
- Browser Network tab: verify `GET /v1/draft/stream?league_id=...` opens and receives events
- Check both job status endpoints return `Active` state
- Look for recent picks in Redux DevTools or `useDraftStream` state

#### Intervention toggle doesn't work

**Likely causes**:
1. CSS selector precedence issue: `.practice-toggle` lost to generic `.practice-draft-screen label` column rule
   - Fix: use `.practice-draft-screen label.practice-toggle` with explicit `flex-direction: row`
2. localStorage access blocked (private mode, etc.)
   - Fix: `loadShowInterventions()` guards with try/catch, defaults to `true` if storage unavailable

## Naming Conventions

### Components
- PascalCase: `ConfigScreen`, `PracticeDraftScreen`, `StatusHeader`, etc.
- Suffix `.tsx` for React components with imports
- File name matches exported component (no nested default exports)

### Hooks
- Prefix `use`: `useDraftStream`
- Location: `src/hooks/`

### API Functions
- Action-style names: `setDraftConfig`, `startDraftSync`, `getDraftStatus`, `startPracticeSyncJob`
- No `async` prefix in name — caller knows it's async
- Location: `src/api/client.ts`

### State Keys (localStorage)
- Kebab-case prefixed with `fantasy-web-ui.`: `fantasy-web-ui.draft-config`, `fantasy-web-ui.practice-show-interventions`

### CSS Classes
- kebab-case: `.practice-toggle`, `.pick-feed`, `.status-header`
- Specificity: avoid `!\` important; use selector hierarchy instead

## Frontend Validation Checklist

Before merging:

1. **Type safety**: `npx tsc -b --noEmit` passes (no implicit `any`)
2. **Build**: `npm run build` succeeds
3. **Lint**: `npm run lint` passes (ESLint + oxlint)
4. **Manual tests**:
   - Live Draft Day: open ConfigScreen, enter valid league/team/season, play picks should flow
   - Practice Draft: paste real ESPN practice room URL, confirm league/team auto-populate, start sync, verify both jobs run, picks stream in
   - Practice toggle: off/on should hide/show `InterventionControls` without breaking stream
   - Error states: test network errors, malformed URLs, incomplete configs

## Deployment

Deployed via Vite/Docker → `fantasy-infra` K8s deployment (`base/web-ui/deployment.yaml` or overlays). See `fantasy-infra/.github/copilot-instructions.md` for deployment flow.

## Related Repos & Links

- **fantasy-core-pipeline**: Publishes `/v1/draft/*` API that this UI consumes
  - Issue: fantasy-core-pipeline#47 (practice mode config support — CORE-18)
  - Issue: fantasy-core-pipeline#48 (practice listener startup)
  
- **fantasy-infra**: K8s deployment
  - Issue: fantasy-infra#40 (add `DRAFT_SYNC_IMAGE` env var)

- **fantasy-browser-worker**: Draft-click automation
  - Used by both live (`fantasy-browser-worker#32` for draft selection) and practice modes

- **GitHub Project**: Fantasy Manager — tracks cross-repo interdependencies

## Future Enhancements

- [ ] Add test framework (Jest + React Testing Library)
- [ ] Persist draft configs to backend (DB) instead of localStorage
- [ ] Add signal-based reactivity library (replace useState chains)
- [ ] Multi-league dashboard (watch live + practice in same session)
- [ ] Export draft summary as CSV/PDF after completion
- [ ] Dark mode toggle

---

**Last Updated**: August 21, 2026  
**Related Issues**: fantasy-web-ui#6, fantasy-web-ui#7 (practice parity)

