import type { Meta, StoryObj } from '@storybook/react-vite'
import { AutodraftBadge } from './AutodraftBadge'

const meta = {
  title: 'Player/AutodraftBadge',
  component: AutodraftBadge,
  args: { isSuspected: true },
} satisfies Meta<typeof AutodraftBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Suspected: Story = {}
export const NotSuspected: Story = { args: { isSuspected: false } }
