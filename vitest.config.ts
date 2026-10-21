import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    // Local runs and the self-hosted CI runners share one 8-core host with the cluster, and
    // several sessions often test at once. Uncapped runs saturated it (load ~47) and starved
    // the core-pipeline's health probes. VITEST_MAX_WORKERS overrides this for a quiet machine.
    maxWorkers: process.env.VITEST_MAX_WORKERS ?? '25%',
    projects: [
      {
        test: { name: 'unit', environment: 'jsdom', setupFiles: ['./src/testSetup.ts'] },
      },
      {
        // Renders every story in headless Chromium and runs its play function as a test.
        plugins: [storybookTest({ configDir: '.storybook' })],
        // Pre-bundle up front: a dependency discovered mid-run makes Vite reload the
        // browser, which fails whichever story files were loading at the time.
        optimizeDeps: {
          include: [
            '@mantine/core', '@mantine/hooks', '@mantine/charts', '@mantine/nprogress',
            '@dnd-kit/core', '@tanstack/react-query', 'react-router-dom', 'react-markdown', 'remark-gfm',
            'storybook/test', 'storybook/theming', 'react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime', 'react-dom/client',
          ],
        },
        test: {
          name: 'storybook',
          browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }] },
        },
      },
    ],
  },
})
