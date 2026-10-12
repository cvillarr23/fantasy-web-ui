import type { StorybookConfig } from '@storybook/react-vite'
import remarkGfm from 'remark-gfm'

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    // GFM for the tables in MDX docs pages.
    { name: '@storybook/addon-docs', options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } } },
    '@storybook/addon-vitest',
  ],
  core: { disableTelemetry: true },
  // The app's dev-server proxy points at a local API; stories mock fetch instead.
  viteFinal: (viteConfig) => ({ ...viteConfig, server: { ...viteConfig.server, proxy: undefined } }),
}

export default config
