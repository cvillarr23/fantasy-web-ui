---
title: Design system
description: Palette tokens, labeling rules, layout conventions and where shared components live in the web UI.
sidebar_position: 4
---

Browse the shared components in the [component library](pathname:///ui/components/), a Storybook build of the stories in this repository.

Edit `src/theme.ts` to change the application palette. It exports the semantic `palette`, Mantine `theme`, and `cssVariablesResolver`; `src/main.tsx` installs all three through MantineProvider. Do not add page-specific hex colors.

| Token | Meaning |
| --- | --- |
| background / surface / raised | Page, card, elevated controls |
| border | Separators and control outlines |
| text / secondary | Primary and supporting text |
| accent | Navigation, links, primary actions |
| projected | Estimated/projected fantasy points |
| incoming | Players received or added; positive changes |
| outgoing | Players sent or dropped |
| warning / error | Uncertainty and problems |

CSS uses the variables defined by the resolver (`--bg`, `--surface`, `--raised`, `--border`, `--text-h`, `--text`, `--accent`, `--projected`, `--incoming`, `--outgoing`, `--warn`, `--error`). Mantine's semantic color names derive from these palette values; the violet primary ramp is also defined in this file.

## Labels and numbers

Use explicit labels as well as color: **Actual**, **Projected**, **Add to your roster**, **Drop from your roster**.

- `ScoreValue` provides consistent numeric formatting.
- Unknown data displays a dash, not zero.
- VORP is a value comparison and must not be labeled fantasy points.

## Layout

| Element | Convention |
| --- | --- |
| Navigation | Sidebar at 900px and above, with a labeled drawer on narrower screens. |
| Matchups | Player cards on mobile. |
| Wide analytical tables | Scroll inside their container. The page itself must not overflow. |
| Tables | Tabular numbers, striped rows, descriptive column labels and visible focus states. |

## Week selection

Weekly screens use `useSelectedWeek`:

- A valid `?week=1..18` selects a week.
- Without it, the screen follows ESPN's current league week.
- “Current week” removes the override.

Don't initialize a page to week 1 or a build-time week.

## Where do shared components go?

| Folder | Holds | Examples |
| --- | --- | --- |
| `src/components/ui/` | Generic pieces with no fantasy-specific logic | `PageHeader`, `ErrorAlert`, `EmptyState`, `Pager`, `ScoreValue`, `formatNumber` |
| `src/components/player/` | How a player is shown | `PlayerCard`, `PlayerAvatar`, `InjuryBadge`, `PlayerSides` |
| `src/components/tradeScore/`, `inbox/`, `chat/`, `skeletons/` | Pieces for one feature | `TradeScoreBreakdown`, `RetryResponseButton` |
| `src/components/` | Pages and the panels that own data | `LineupPage`, `TradeBuilder` |

Rules for a shared component:

- It takes typed props and does no data fetching. The page or a hook fetches, and the component renders.
- It has a `*.stories.tsx` file next to it covering its main states: loaded, empty, unknown values shown as "—", loading and error where they apply.
- Stories use synthetic data only, such as `tradeScore/fixtures.ts`, `inbox/inboxFixtures.ts` and `src/stories/fixtures.ts`. The library is published.
- Before writing markup a second time, check the library for a component that already does it.

## Why is the component library dark only?

The app forces dark mode, and `palette` only defines dark values. The library renders the same theme, so it shows what users see.

## Inline explanations and trade values

`InfoTip` takes a term `label` and explanation `children`. It opens on hover, keyboard focus or tap; Escape, another tap or clicking outside dismisses it. Popovers use a portal so scrolling tables do not clip them.

`StrengthChip` takes a nullable numeric `value`, optional `label` and optional boolean `info` (default false). It displays two decimals and uses that displayed value to label strength: at least +0.50 is strong, at most −0.50 is weak, and other values are average. Colour uses a ±0.05 dead band: values above it are orange, values below it are blue, and values inside it are secondary. Nonzero displayed values have an up or down arrow. Unknown values use a dashed border. Opt into help for standalone chips; tables place a single InfoTip on each strength column header.

`StatTile` takes a `label`, nullable numeric `value`, optional `info`, optional `caption` and optional decimal `precision` (default 1). Values above +0.05 are teal, values below −0.05 are pink, and values inside the dead band or unavailable values use secondary text. It uses `signedScore` for number formatting and the shared “Not available” label. Trade explanations live in `tradeScore/tradeGlossary.ts`; use `tradeGlossaryForWeights(score.weights)` for scored proposals so formula copy reflects the returned strength weight, z clamp and indirect factor.
