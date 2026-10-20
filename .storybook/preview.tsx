import type { Preview } from '@storybook/react-vite'
import { MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { storybookTheme } from './theme'
import '@mantine/core/styles.css'
import '@mantine/charts/styles.css'
import '@mantine/nprogress/styles.css'
import '../src/index.css'
import '../src/App.css'
import { queryClient } from '../src/api/queryClient'
import { cssVariablesResolver, palette, theme } from '../src/theme'
import { restoreFetch } from './mockFetch'

const appDefaults = queryClient.getDefaultOptions()

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    backgrounds: { options: { app: { name: 'App', value: palette.background } } },
    docs: { theme: storybookTheme },
    options: { storySort: { order: ['Introduction', 'UI', 'Player', 'Inputs', 'Status', 'Trade score', 'Inbox', 'Chat'] } },
  },
  initialGlobals: { backgrounds: { value: 'app' } },
  // Every story starts from an empty cache and the real fetch; stories that need data
  // seed the cache or call mockFetch in their own beforeEach.
  beforeEach: () => {
    queryClient.clear()
    queryClient.setDefaultOptions({ ...appDefaults, queries: { ...appDefaults.queries, retry: false } })
    return () => {
      restoreFetch()
      queryClient.clear()
    }
  },
  decorators: [
    (Story, { parameters }) => (
      // The app forces dark mode (src/main.tsx) and the palette has no light values.
      <MantineProvider forceColorScheme="dark" theme={theme} cssVariablesResolver={cssVariablesResolver}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[(parameters.route as string | undefined) ?? '/']}>
            <Story />
          </MemoryRouter>
        </QueryClientProvider>
      </MantineProvider>
    ),
  ],
}

export default preview
