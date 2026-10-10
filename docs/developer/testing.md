---
title: Testing
description: Run unit and component tests, lint and the same checks as CI.
sidebar_position: 5
---

Tests use Vitest with jsdom and Testing Library. `src/testSetup.ts` stubs `ResizeObserver`, `matchMedia` and `scrollIntoView`, which jsdom lacks.

| Command | Does |
|---|---|
| `npm test` | Run all tests once |
| `npm run lint` | oxlint |
| `npx tsc -b --noEmit` | Typecheck |
| `npm run build` | Typecheck and production build |

CI runs install, lint, typecheck and build on every PR, and publishes the image on `master`.

:::tip
If Vitest workers crash, use Node 22 rather than an older default.
:::

## How do I write a test?

- Put it next to the file, as `Thing.test.tsx`.
- Mock `fetch` or the functions in `src/api/`; tests never reach a real API.
- Render pages inside a `QueryClientProvider` and a `MantineProvider`. Seed the config through `localStorage` under `fantasy-web-ui.draft-config`.
- Use fixtures with synthetic players and IDs only. See [Docs style guide](/contributing/docs-style-guide) on personal data.
