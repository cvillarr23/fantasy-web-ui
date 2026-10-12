import type { Meta, StoryObj } from '@storybook/react-vite'
import { DeficitBadge, SwapBadge } from './DeficitBadge'

const meta = {
  title: 'Player/DeficitBadge',
  component: DeficitBadge,
  args: { isDeficit: true },
} satisfies Meta<typeof DeficitBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Deficit: Story = {}
export const NoDeficit: Story = { args: { isDeficit: false } }

/** `SwapBadge` lives in the same file and marks a starter the optimizer would bench. */
export const Swap: Story = { render: () => <SwapBadge benchFor="Sample Runner" /> }
