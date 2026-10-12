import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { PlayerSides } from './PlayerSides'

const meta = {
  title: 'Player/PlayerSides',
  component: PlayerSides,
  args: {
    receive: [{ espn_id: '222', name: 'Received Back' }],
    send: [{ espn_id: '111', name: 'Sent Back' }, { espn_id: '112', name: 'Sent Depth' }],
  },
} satisfies Meta<typeof PlayerSides>

export default meta
type Story = StoryObj<typeof meta>

export const Trade: Story = {}

/** A player ESPN didn't name still shows its ESPN ID. */
export const UnnamedPlayer: Story = {
  args: { receive: [{ espn_id: '888', name: null }] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Unnamed player (ESPN 888)')).toBeVisible()
  },
}
