import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { mockFetch } from '../../.storybook/mockFetch'
import { Layout } from './Layout'

const meta = {
  title: 'App/Layout',
  component: Layout,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      viewports: {
        shortDesktop: {
          name: 'Short desktop (1280 × 720)',
          styles: { width: '1280px', height: '720px' },
        },
      },
      defaultViewport: 'shortDesktop',
    },
  },
  beforeEach: () => mockFetch([{ path: /^\/v1\/activity\/actions/, body: { items: [] } }]),
} satisfies Meta<typeof Layout>

export default meta
type Story = StoryObj<typeof meta>

export const SettingsReachableOnShortDesktop: Story = {
  play: async ({ canvas }) => {
    const settings = canvas.getByRole('link', { name: 'Settings' })
    await expect(settings).toBeVisible()
    await userEvent.click(settings)
    await expect(settings).toHaveAttribute('aria-current', 'page')
  },
}
