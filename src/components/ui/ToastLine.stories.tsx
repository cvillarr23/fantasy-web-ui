import type { Meta, StoryObj } from '@storybook/react-vite'
import { ToastLine } from './ToastLine'

const meta = {
  title: 'UI/ToastLine',
  component: ToastLine,
  args: { toast: { tone: 'success', message: 'Lineup change queued.' } },
} satisfies Meta<typeof ToastLine>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {}
export const Error: Story = { args: { toast: { tone: 'error', message: 'Could not queue the lineup change.' } } }
export const None: Story = { args: { toast: null } }
