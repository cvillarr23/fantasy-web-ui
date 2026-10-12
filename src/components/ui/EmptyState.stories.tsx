import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmptyState } from './EmptyState'

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  args: { children: 'No free agents match.', tone: 'muted' },
  argTypes: { tone: { control: 'inline-radio', options: ['muted', 'alert'] } },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Muted: Story = {}
export const Callout: Story = { args: { tone: 'alert', children: 'No matchups this week.' } }
