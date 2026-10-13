import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Pager } from './Pager'

const meta = {
  title: 'UI/Pager',
  component: Pager,
  args: { onPrevious: fn(), onNext: fn(), previousDisabled: false, nextDisabled: false, summary: '51–100 of 120' },
  argTypes: { buttonVariant: { control: 'inline-radio', options: ['filled', 'default', 'light'] } },
} satisfies Meta<typeof Pager>

export default meta
type Story = StoryObj<typeof meta>

export const MiddlePage: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }))
    await expect(args.onNext).toHaveBeenCalled()
  },
}

export const FirstPage: Story = {
  args: { previousDisabled: true, summary: '1–50 of 120', buttonVariant: 'default' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Previous' })).toBeDisabled()
  },
}

export const NoSummary: Story = { args: { summary: undefined, nextDisabled: true } }
