import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { WeekSelector } from './WeekSelector'

const meta = {
  title: 'UI/WeekSelector',
  component: WeekSelector,
  args: { week: 6, onChange: fn(), min: 1, max: 18 },
} satisfies Meta<typeof WeekSelector>

export default meta
type Story = StoryObj<typeof meta>

/** Following ESPN's current week: no `?week` in the URL, so there's no "Current week" button. */
export const CurrentWeek: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByRole('button', { name: 'Current week' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Next week' }))
    await expect(args.onChange).toHaveBeenCalledWith(7)
  },
}

/** A `?week` override shows the "Current week" button, which removes it. */
export const WeekOverride: Story = {
  parameters: { route: '/lineup?week=6' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Current week' })).toBeVisible()
  },
}

export const FirstWeek: Story = {
  args: { week: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Previous week' })).toBeDisabled()
  },
}

/** An invalid week shows "Select week" and disables both arrows. */
export const Unknown: Story = {
  args: { week: 'not-a-week' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Next week' })).toBeDisabled()
  },
}
