import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { mockFetch } from '../../.storybook/mockFetch'
import type { DraftStatusResponse } from '../api/types'
import { StatusHeader } from './StatusHeader'

const inSeconds = (s: number) => Math.round(Date.now() / 1000) + s

const status = (over: Partial<DraftStatusResponse> = {}) =>
  ({
    league_id: '123',
    season: 2026,
    mode: 'practice',
    job_state: 'Active',
    pipeline_health: 'healthy',
    on_the_clock_team_id: '8',
    autodraft_active_team_id: null,
    recommendation: { pick_number: '14' },
    ...over,
  }) as DraftStatusResponse

/** The draft-day status bar. Team names come from `/v1/league/teams`; "Hold this pick"
 * calls `/v1/draft/pause`. */
const meta = {
  title: 'Status/StatusHeader',
  component: StatusHeader,
  args: {
    status: status(),
    connected: true,
    connectionState: 'connected',
    reconnectCount: 0,
    lastHeartbeatAt: Date.now(),
    lastPickAt: Date.now() - 42_000,
    stale: false,
    isMyTurn: false,
    myTeamId: '7',
    leagueId: '123',
    pickNumber: 14,
    held: false,
    setHeld: fn(),
    holdEnabled: true,
    loading: false,
  },
  beforeEach: () =>
    mockFetch([
      { path: /^\/v1\/league\/teams/, body: { '7': 'Our Team', '8': 'Rival Team' } },
      { path: '/v1/draft/pause', method: 'POST', body: { status: 'paused' } },
    ]),
} satisfies Meta<typeof StatusHeader>

export default meta
type Story = StoryObj<typeof meta>

export const OtherTeamPicking: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Rival Team')).toBeVisible()
  },
}

export const MyTurn: Story = {
  args: {
    isMyTurn: true,
    status: status({ on_the_clock_team_id: '7', recommendation: { pick_number: '14', auto_publish_at: inSeconds(25), pick_clock_expires_at: inSeconds(55) } }),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Hold this pick' }))
    await expect(args.setHeld).toHaveBeenCalledWith(true)
  },
}

export const Held: Story = {
  args: { ...MyTurn.args, held: true },
}

export const ReconnectingAndStale: Story = {
  args: { connected: false, connectionState: 'reconnecting', reconnectCount: 2, stale: true },
}

export const AutodraftOn: Story = {
  args: { status: status({ autodraft_active_team_id: '7' }) },
}

/** No status yet: unknown fields show "—". */
export const NoStatus: Story = {
  args: { status: null, lastHeartbeatAt: null, lastPickAt: null, connected: false, connectionState: 'connecting' },
}

export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Loading draft status')).toHaveAttribute('aria-busy', 'true')
  },
}
