---
title: Design system
description: Palette tokens, labeling rules, layout conventions and where shared components live in the web UI.
sidebar_position: 4
---

Browse the shared components in the [component library](pathname:///ui/components/), a Storybook build of the stories in this repository. The [Patterns page](pathname:///ui/components/?path=/docs/patterns--guide) renders the real components next to the guidance below.

Edit `src/theme.ts` to change the application palette. It exports the semantic `palette`, Mantine `theme`, and `cssVariablesResolver`; `src/main.tsx` installs all three through MantineProvider. Do not add page-specific hex colors.

The app uses a warm earth ground with clay primary actions. Storybook's manager, docs, and previews share these tokens.

| Token | Value | Meaning |
| --- | --- | --- |
| background | `#17130f` | Page ground |
| surface | `#221c16` | Cards and controls |
| raised | `#2e261f` | Elevated controls and hover states |
| border | `#4d4237` | Separators and control outlines |
| text | `#f7f0e6` | Primary text |
| secondary | `#c7bba9` | Supporting text |
| muted | `#9a8e80` | Less prominent text, input placeholders, and dropdown chevrons |
| accent | `#c47f56` | Navigation, links, primary actions |
| accentInk | `#cd926f` | Accessible clay text on overlays |
| onAccent | `#14151c` | Dark text on filled actions and badges |
| overlay / overlayBorder | `#382f26` / `#6b5c4c` | Tooltip and popover surfaces and outlines |
| disabled / disabledText | `#3d342b` / `#9a8e80` | Disabled controls |
| projected | `#8cc8ff` | Estimated/projected fantasy points |
| incoming | `#6ee7c0` | Players received or added; positive changes |
| outgoing | `#ffbb82` | Players sent or dropped |
| warning / error | `#fcd479` / `#ff9aa9` | Uncertainty and problems |

CSS uses the variables defined by the resolver (`--bg`, `--surface`, `--raised`, `--border`, `--text-h`, `--text`, `--muted`, `--accent`, `--on-accent`, `--projected`, `--incoming`, `--outgoing`, `--warn`, `--error`). `--accent-bg` and `--accent-border` apply alpha to the clay token for selected surfaces and outlines.

Mantine's semantic color names derive from these palette values. Its `clay` primary ramp uses shade 5 for the exact accent, with shade 6 on hover. Automatic contrast uses `onAccent` for dark text on light fills, including semantic badges. The `dark` ramp and default, placeholder, and disabled variables use earth neutrals.

### Text contrast

Use WCAG AA's 4.5:1 minimum for normal text. The palette provides these ratios:

| Pair | Contrast |
| --- | --- |
| Body text on page ground | 16.33:1 |
| Secondary text on page ground / raised surface | 9.78:1 / 7.86:1 |
| Clay links on page ground / raised surface | 5.73:1 / 4.61:1 |
| Dark text on clay fill / hover | 5.65:1 / 4.65:1 |
| Primary text on tooltip/popover | 11.58:1 |
| Lighter clay ink on overlay | 4.95:1 |
| Muted supporting text on page ground | 5.77:1 |
| Input placeholder on surface | 5.26:1 |
| Select chevron on surface | 5.26:1 |
| Overlay clay ink on Menu hover/focus surface | 5.62:1 |
| Secondary text on overlay | 6.93:1 |
| Muted text on overlay | 4.09:1 (fails AA) |

Dropdowns (Select, Combobox, MultiSelect, Autocomplete, and Menu), popovers, and tooltips share overlay surfaces and lighter clay ink for links and accent text. `.muted` uses a separate solid muted token rather than reducing opacity. Default and filled inputs explicitly use `surface`, with muted placeholders and chevrons; disabled fields keep their separate disabled fill. Menu hover and focus use `raised` to preserve overlay ink contrast. Keyboard-highlighted options use dark `onAccent` text on the clay fill.

Rules from the Trades redesign review:

- Muted text must be clearly different from body text, and never uses reduced opacity. `.muted` (the muted token, `#9a8e80`) is for de-emphasised text on surfaces. `c="dimmed"` resolves to secondary text (`#c7bba9`) and is what goes on overlays: tooltips, InfoTips and popovers.
- Inputs have their own `surface` background, separate from the open dropdown's `overlay`, and a filled input must not look like a disabled one.
- Placeholder text, the Select chevron and hovered menu items must all meet AA.
- Muted `#9a8e80` is only 4.09:1 on the overlay `#382f26`. Tooltip, InfoTip and popover bodies therefore use secondary text (`c="dimmed"` resolves to it), or the overlay would have to be darkened until muted passes.

Use light or outline badges on dark surfaces, or automatic contrast for filled badges. Avoid using primary text on clay fills. Disabled controls are exempt from the normal-text contrast requirement.

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

`StrengthChip` takes a nullable numeric `value`, optional `label` and optional boolean `info` (default false). It displays two decimals and uses that displayed value to label strength: at least +0.50 is strong, at most −0.50 is weak, and other values are average. Colour uses the rounded displayed value with a ±0.05 dead band: values above it are orange, values below it are blue, and values inside it are secondary. Nonzero displayed values have an up or down arrow. Unknown values use a dashed border. Opt into help for standalone chips; tables place a single InfoTip on each strength column header.

`StatTile` takes a `label`, nullable numeric `value`, optional `info`, optional `caption` and optional decimal `precision` (default 1). Values above +0.05 are teal, values below −0.05 are pink, and values inside the dead band or unavailable values use secondary text. Colour follows the rounded displayed value, and signed zero is shown without a sign. It uses `signedScore` for number formatting and the shared “Not available” label. Trade explanations live in `tradeScore/tradeGlossary.ts`; use `tradeGlossaryForWeights(score.weights)` for scored proposals so formula copy reflects the returned strength weight, z clamp and indirect factor. The static `tradeGlossary` contains only weight-independent entries. Missing or nonfinite weights produce plain explanations without formulas.

## Page anatomy

The Trades page (`TradePage`, [Patterns story](pathname:///ui/components/?path=/docs/patterns--guide)) is the model for other pages:

1. `PageHeader` with summary pills. Each pill is a `Badge` that links to the section it counts, and loading or failed counts say so ("… proposable trades found", "Approval count unavailable").
2. The main "ready to act" section first.
3. Then a browser: team filter cards (`TradeFinderTeamCards`), filters, and a table on desktop that turns into cards on phones (`TradeFinder`, `TradeCandidateRow`).
4. Secondary sections in collapsed `<details className="trade-section">` panels, such as "Build your own" and "League context". A panel opens itself when something sends the user there, such as "Open in builder".
5. On desktop, a sticky right rail (`.finder-details`) shows the selected item. On phones it is a single column with no page overflow; wide tables scroll inside their container.

## Explaining numbers

- **`InfoTip`** for every unfamiliar term. Copy comes from the shared glossary module `tradeScore/tradeGlossary.ts`, never inline. It works on hover, focus and tap. Escape closes only the tip and must not close other overlays such as a modal behind it.
- **Signed values** (`StatTile`, `signedScore`): teal means good for us and pink means bad. Color comes from the rounded value shown, with a neutral zone of ±0.05 around zero. Unknown shows a dash.
- **`StrengthChip`** for z strength: arrow, two decimals and the labels strong, average or weak.
- **Totals get a breakdown.** Any score shown as a total opens a week-by-week hover breakdown (`GainBreakdown`). It is a non-modal `role="dialog"` named for what it explains, not a tooltip, because it can contain a Retry button. Opening it fires a live solve, so hover opens after a short delay.

## Status and actions

- Shared status labels (`CandidateStatus`): **Proposable**, **Needs a drop**, and one-sided with its reason (for example "Hurts them").
- Generated messages can be edited before sending, and the generated draft is kept with the offer (`ProposalMessage`).
- Approval steps (`TradeOfferApproval`) need a confirmation checkbox, an approver name and a visible warning before the primary button turns on.
- "Scored live just now" appears only for the automatic score. A manual re-score removes it.

## Copy rules

- Use explicit labels, not color alone.
- Show a dash for unknown values, never zero.
- VORP is a value comparison, not fantasy points.

## Storybook definition of done

Each new component or page gets stories for loading, error, empty, stale and phone width (`globals: { viewport: { value: 'mobile1' } }`), `mockFetch` fixtures for any network reads, and `play` tests. Attach desktop and phone screenshots to the PR. `npm run lint`, `npm test` and `npm run test:stories` must pass, and no page-specific hex colors may be added.
