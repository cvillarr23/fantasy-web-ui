import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ApiError } from '../../api/client'
import { ApprovalDecisionDialog } from './ApprovalDecisionDialog'

const meta = {
  title: 'Jobs/Approval decision dialog',
  component: ApprovalDecisionDialog,
  args: { opened: true, decision: 'approve', title: 'Approve lineup changes', then: '', deciding: false, error: null, onConfirm: fn(), onClose: fn() },
} satisfies Meta<typeof ApprovalDecisionDialog>
export default meta
type Story = StoryObj<typeof meta>

export const Approve: Story = {}
export const ApproveStartsARun: Story = { args: { then: 'set-lineup (week: 9)' } }
export const Dismiss: Story = { args: { decision: 'dismiss' } }
export const Deciding: Story = { args: { deciding: true } }
export const Refused: Story = { args: { error: new ApiError(409, 'Approval is no longer waiting.') } }
