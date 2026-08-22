# Handoff prompt: full Draft Day UI parity for practice mode

## fantasy-web-ui — issue #7

```
Work the issue at https://github.com/cvillarr23/fantasy-web-ui/issues/7.

Read the full issue body first - it has the exact files, reused components, and API
contract to build against.

Summary: this extends the existing Practice Draft screen (src/components/
PracticeDraftScreen.tsx, shipped in #9/#11) rather than replacing it - that screen already
handles pasting an ESPN room URL and starting the room-sync Job. This ticket adds the
second half: once connected, also launch fantasy-core-pipeline's practice-mode draft_matrix.py
listener (already merged - POST /v1/draft/config with mode: 'practice', then
POST /v1/draft/start?league_id=... targeting that same league), and render the exact same
Draft Day components - StatusHeader, PickFeed, RecommendationPanel, InterventionControls -
reused unmodified, fed by the existing useDraftStream(leagueId, season) hook. Add a toggle
that hides InterventionControls for a dedicated zero-intervention acceptance run (issue #6's
original test), defaulting to visible (full parity) otherwise.

You'll need to: add mode: 'live' | 'practice' to DraftConfig in src/api/types.ts, add an
optional leagueId param to startDraftSync() in src/api/client.ts (the backend route already
supports ?league_id=...), and collect/parse the practice league's team_id/season within the
practice screen itself.

No test framework exists in this repo - verify with npx tsc -b --noEmit && npm run build &&
npm run lint. Manually verify: paste a real practice room URL, confirm both Jobs start,
confirm live picks appear in PickFeed, confirm the InterventionControls toggle works in both
positions. Open the PR against master, referencing "Closes #7".
```

---

## Not a standard coding handoff: fantasy-browser-worker#43

https://github.com/cvillarr23/fantasy-browser-worker/issues/43 (blocks #38's closure) is a
**live rehearsal**, not an async implementation ticket — its own description calls for
"someone watching" a real practice draft run so a live surprise (reCAPTCHA, session expiry,
a missed selector) can be caught and worked around in the moment. It depends on #7 shipping
first (that's the UI you'd actually watch it through). Don't hand this one to a fresh agent
session the same way as the others — it needs you driving it live, most usefully once #7 is
merged and deployed.
