# Issue #72: lineup quick actions

Captured from the running Vite app in Chromium with deterministic API fixtures (not live league data). Desktop viewport: 1440 × 1100; mobile viewport: 390 × 844.

- [Lineup with a staged swap](issue-72-lineup.png)
- [Waiver Manager with week-aware return and trade links](issue-72-waivers.png)
- [TradeBuilder initialized to the selected week](issue-72-trades.png)
- [Mobile lineup with wrapped quick actions](issue-72-mobile.png)

Browser verification followed Lineup → Waivers → Trades → Lineup, checked week preservation and the restored staged swap, and checked for page errors and mobile document overflow. API requests were intercepted; no live lineup or waiver submissions were made.
