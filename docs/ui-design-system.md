# UI design system

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

Use explicit labels as well as color: **Actual**, **Projected**, **Add to your roster**, **Drop from your roster**. `ScoreValue` provides consistent numeric formatting. Unknown data displays a dash, not zero. VORP is a value comparison and must not be labeled fantasy points.

Navigation uses a sidebar at 900px and above, with a labeled drawer on narrower screens. Matchups use player cards on mobile. Wide analytical tables scroll inside their container; the page itself must not overflow. Tables use tabular numbers, striped rows, descriptive column labels, and visible focus states.

Weekly screens use `useSelectedWeek`: a valid `?week=1..18` selects a week; without it the screen follows ESPN's current league week. “Current week” removes the override. Do not initialize a page to week 1 or a build-time week.
