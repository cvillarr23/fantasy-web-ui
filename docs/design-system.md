---
title: Design system
description: Palette tokens, labeling rules, layout conventions and where shared components live in the web UI.
sidebar_position: 4
---

Browse the shared components in the [component library](pathname:///ui/components/), a Storybook build of the stories in this repository.

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
| accent | `#c47f56` | Navigation, links, primary actions |
| accentInk | `#cd926f` | Accessible clay text on overlays |
| onAccent | `#14151c` | Dark text on filled actions and badges |
| overlay / overlayBorder | `#382f26` / `#6b5c4c` | Tooltip and popover surfaces and outlines |
| disabled / disabledText | `#3d342b` / `#9a8e80` | Disabled controls |
| projected | `#8cc8ff` | Estimated/projected fantasy points |
| incoming | `#6ee7c0` | Players received or added; positive changes |
| outgoing | `#ffbb82` | Players sent or dropped |
| warning / error | `#fcd479` / `#ff9aa9` | Uncertainty and problems |

CSS uses the variables defined by the resolver (`--bg`, `--surface`, `--raised`, `--border`, `--text-h`, `--text`, `--accent`, `--on-accent`, `--projected`, `--incoming`, `--outgoing`, `--warn`, `--error`). `--accent-bg` and `--accent-border` apply alpha to the clay token for selected surfaces and outlines.

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
| Muted supporting text on page ground | 9.78:1 |

Dropdowns (Select, Combobox, MultiSelect, Autocomplete, and Menu), popovers, and tooltips share overlay surfaces and lighter clay ink for links and accent text. `.muted` uses solid secondary text rather than reducing opacity. Keyboard-highlighted options use dark `onAccent` text on the clay fill.

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
