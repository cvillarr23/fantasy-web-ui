import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { ApprovalPanel } from './ApprovalPanel'
import { chainApprovalFixture, tradeApprovalFixture } from './fixtures'

const meta = {
  title: 'Jobs/Approval panel',
  component: ApprovalPanel,
  args: { run: chainApprovalFixture },
} satisfies Meta<typeof ApprovalPanel>
export default meta
type Story = StoryObj<typeof meta>

/** A chain step that waits for a person: nowhere else to decide, so it carries the buttons. */
export const WaitingChainStep: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /^Approve/ })).toBeVisible()
    await expect(canvas.getByRole('button', { name: /^Dismiss/ })).toBeVisible()
  },
}
/** A trade offer is approved on the Trades page, so the panel only links there. */
export const WaitingTradeOffer: Story = {
  args: { run: tradeApprovalFixture },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Open' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /^Approve/ })).toBeNull()
  },
}
export const Approved: Story = {
  args: { run: { ...chainApprovalFixture, status: 'success', end_reason: 'approved', requested_by: 'sam', finished_at: '2026-11-04T09:00:00Z' } },
}
export const Dismissed: Story = {
  args: { run: { ...chainApprovalFixture, status: 'skipped', end_reason: 'dismissed', finished_at: '2026-11-04T09:00:00Z' } },
}
export const Superseded: Story = {
  args: { run: { ...tradeApprovalFixture, status: 'skipped', end_reason: 'superseded', finished_at: '2026-11-04T09:00:00Z' } },
}
export const Expired: Story = {
  args: { run: { ...tradeApprovalFixture, status: 'skipped', end_reason: 'expired', finished_at: '2026-11-07T22:00:00Z' } },
}
/** Asking first shows what approving does. */
export const ConfirmApprove: Story = {
  play: async ({ canvas, canvasElement }) => {
    ;(await canvas.findByRole('button', { name: /^Approve/ })).click()
    await expect(await within(canvasElement.ownerDocument.body).findByRole('dialog')).toBeVisible()
  },
}
