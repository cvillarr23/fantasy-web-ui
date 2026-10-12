import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-vitest'],
  core: { disableTelemetry: true },
  // The app's dev-server proxy points at a local API; stories mock fetch instead.
  viteFinal: (viteConfig) => ({ ...viteConfig, server: { ...viteConfig.server, proxy: undefined } }),
}

export default config
