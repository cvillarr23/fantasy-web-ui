import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { INJURY_BADGES, InjuryBadge } from './InjuryBadge'

const meta = {
  title: 'Player/InjuryBadge',
  component: InjuryBadge,
  args: { status: 'QUESTIONABLE' },
  argTypes: { status: { control: 'select', options: [...Object.keys(INJURY_BADGES), 'ACTIVE', 'NEW_STATUS', null] } },
} satisfies Meta<typeof InjuryBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Questionable: Story = {}
export const InjuredReserve: Story = { args: { status: 'INJURY_RESERVE' } }
export const Out: Story = { args: { status: 'OUT' } }

/** Statuses the badge doesn't know are shown as-is rather than hidden. */
export const UnrecognizedStatus: Story = {
  args: { status: 'NEW_STATUS' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('NEW_STATUS')).toBeVisible()
  },
}

/** Healthy and unknown players render nothing. */
export const Healthy: Story = {
  args: { status: 'ACTIVE' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.mantine-Badge-root')).toBeNull()
  },
}
