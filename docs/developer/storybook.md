---
title: Component library
description: Run Storybook, write a story for a shared component and mock its data.
sidebar_position: 6
---

The component library is a Storybook build of every `*.stories.tsx` file. The docs site publishes it at [/ui/components/](pathname:///ui/components/), and CI runs each story as a test.

:::note[Prerequisites]
Node 22 and `npm ci`. To run story tests, also install the browser once: `npx playwright install chromium`.
:::

## How do I run it?

| Command | Does |
|---|---|
| `npm run storybook` | Dev server on port 6006 with hot reload |
| `npm run build-storybook` | Static build into `storybook-static/` |
| `npm run test:stories` | Render every story in headless Chromium and run its `play` function |

## How do I add a story?

1. Create `Thing.stories.tsx` next to `Thing.tsx`.
2. Set `title` to the folder group, such as `UI/Thing` or `Player/Thing`.
3. Add one named export per state that matters: loaded, empty, unknown values, loading and error.
4. Add a `play` function where the state has a behavior worth checking, such as a disabled button or a callback.
5. Run `npm run test:stories`.

```tsx title="src/components/ui/Pager.stories.tsx"
const meta = {
  title: 'UI/Pager',
  component: Pager,
  args: { onPrevious: fn(), onNext: fn(), previousDisabled: false, nextDisabled: false },
} satisfies Meta<typeof Pager>

export const FirstPage: Story = {
  args: { previousDisabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Previous' })).toBeDisabled()
  },
}
```

Every story renders inside `MantineProvider` with the app theme, the app's `QueryClientProvider` and a `MemoryRouter`. Set `parameters.route` to start at a URL such as `/lineup?week=6`.

## How do I mock API data?

Components call the real API client, so stories stub `fetch`. Call `mockFetch` from `.storybook/mockFetch.ts` in the story's `beforeEach`. The preview restores the real `fetch` and clears the query cache after each story.

```tsx
export const Loaded: Story = {
  beforeEach: () => mockFetch([{ path: '/v1/players/p9002/summary', body: playerSummary }]),
}
```

| Route field | Use |
|---|---|
| `path` | Exact path, or a `RegExp` tested against path plus query string |
| `method` | Defaults to `GET` |
| `status` | HTTP status; use 4xx or 5xx for error states |
| `body` | JSON body, or a function of the request body |
| `delay` | Milliseconds, or `'never'` to keep the request pending for a loading state |

An unmatched request returns a 404, so a missing mock shows up as an error state.

## What data can a story use?

Synthetic data only, because the library is published. Reuse `tradeScore/fixtures.ts`, `inbox/inboxFixtures.ts` and `src/stories/fixtures.ts`. Never use real league, team or member IDs or names. See the [docs style guide](/contributing/docs-style-guide#no-secrets-or-personal-data).
