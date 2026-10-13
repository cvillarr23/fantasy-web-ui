---
title: Testing
description: Run unit and component tests, lint and the same checks as CI.
sidebar_position: 5
---

Vitest runs two projects. `unit` runs `*.test.ts(x)` with jsdom and Testing Library; `src/testSetup.ts` stubs `ResizeObserver`, `matchMedia` and `scrollIntoView`, which jsdom lacks. `storybook` renders every story in headless Chromium and runs its `play` function.

| Command | Does |
|---|---|
| `npm test` | Run the unit tests once |
| `npm run test:stories` | Run every story as a test in headless Chromium |
| `npm run lint` | oxlint |
| `npx tsc -b --noEmit` | Typecheck |
| `npm run build` | Typecheck and production build |

CI runs install, lint, typecheck, unit tests, story tests, the app build and the Storybook build on every PR, and publishes the image on `master`.

Before the first `npm run test:stories`, install the browser once with `npx playwright install chromium`.

:::tip
If Vitest workers crash, use Node 22 rather than an older default.
:::

## How do I write a test?

- Put it next to the file, as `Thing.test.tsx`.
- Mock `fetch` or the functions in `src/api/`; tests never reach a real API.
- Render pages inside a `QueryClientProvider` and a `MantineProvider`. Seed the config through `localStorage` under `fantasy-web-ui.draft-config`.
- Use fixtures with synthetic players and IDs only. See [Docs style guide](/contributing/docs-style-guide) on personal data.
