---
title: Matchup
description: Compare your starters with this week's opponent, with actual and projected points, a live feed and game scores.
sidebar_position: 4
---

Route: `/matchup`. A summary of both teams, a live feed beside a games panel (stacked on narrow screens), then two team columns (player cards on mobile) with starters, a collapsible bench, and suggested swaps.

## What does the summary show?

- **Actual** is what a team or player has scored so far. **Projected** is ESPN's estimate for the whole week. A dash means nothing has been scored yet.
- **Projected margin** is your projected total minus the opponent's.
- **Win chance** is ESPN's live win probability while ESPN sends one (the week in progress). Otherwise it is an estimate from the projected margin, and is labeled as an estimate.
- Each team shows how many starters are **playing** and **yet to play**, plus how many are **on bye**.
- A starter projected for 0.0 is highlighted in red with a "Projected 0.0" label (a red "!" on phones). That usually means the player is out, inactive or on a bye, so check your lineup.
- The pills under the title jump to the summary or to your team.

## How do I see a player's details?

Select a player's row (card on phones) or name on either team to open the player popover (Summary, News and Stats). The name is a button, so Enter and Space work too. A **News** badge marks news from the last 24 hours. A player core can't match to its player records has a plain name and no badge.

## What does a player's game line show?

While core is tracking the week's games, each player with a game has a line under their name:

- **Before kickoff:** the kickoff time in your time zone, then `vs` the opponent at home or `@` the opponent away.
- **During the game:** the quarter and clock, the score, and who has the ball.
- **After the game:** **W**, **L** or **T**, the score with the player's team first, and the opponent.

If core sends no NFL team for a player, the line shows the plain matchup or final score instead.

## What is in the live feed?

Plays and recent news for both teams' players, newest first. Each row has the clock (or the time, for news), a stripe for your player, the opponent's player or news, the player's name (opens the player popover), the text, the game, and the change in fantasy points. A dash means the change is unknown.

Filter it with **All**, **My players**, **Opponent**, **Touchdowns** or **News**. Rows that arrived since the last refresh are highlighted briefly, unless your system asks for reduced motion.

## What is in the games panel?

One tile per NFL game that has a starter from either team: the score and status, the points your starters and the opponent's starters have scored in it (hidden before kickoff), and which starters are playing. A dash means no points are known yet for that side's players. "Updated Ns ago" is the age of the newest live data.

## How often does it refresh?

Every 30 seconds while any player in the matchup has a game in progress. It stops when no game is in progress or the browser tab is hidden.

## Which endpoints does it call?

| Endpoint | Purpose |
|---|---|
| `GET /v1/matchup` | Both sides, with actual and projected points and live game data |
| `GET /v1/matchup/feed` | Plays and news for the live feed |
| `GET /v1/players/{id}/summary` | The player popover |
| `GET /v1/news/recent` | News badges |
| `GET /v1/league/current-week` | Default week |

A `404` means no opponent this week (bye, or the season hasn't reached it) and shows an empty state, not an error. If only the feed fails, the rest of the page stays and the feed offers **Retry**.

## What actions can it take?

Read-only. **Edit lineup for this week** links to [Lineup](./lineup.md) with the same week. Nothing here writes to ESPN, so nothing needs confirmation.
