import type { Meta, StoryObj } from '@storybook/react-vite'
import { Anchor, Button, Menu, Select, Stack } from '@mantine/core'
import { expect, userEvent, within } from 'storybook/test'

const meta = { title: 'UI/Theme', parameters: { layout: 'padded' } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const SelectDropdown: Story = {
  render: () => <Stack maw={360}>
    <p className="muted">Supporting text stays readable on the earth ground.</p>
    <Select label="Position" defaultValue="RB" data={['All positions', 'QB', 'RB', 'WR', 'TE']} />
  </Stack>,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('combobox', { name: 'Position' }))
    const option = await within(canvasElement.ownerDocument.body).findByRole('option', { name: 'QB' })
    const dropdown = option.closest('.mantine-Select-dropdown')!
    expect(getComputedStyle(dropdown).backgroundColor).toBe('rgb(56, 47, 38)')
    expect(getComputedStyle(dropdown).borderTopColor).toBe('rgb(107, 92, 76)')
    const muted = getComputedStyle(canvas.getByText('Supporting text stays readable on the earth ground.'))
    expect(muted.opacity).toBe('1')
    expect(muted.color).toBe('rgb(199, 187, 169)')
    await userEvent.keyboard('{ArrowDown}')
    const highlighted = dropdown.querySelector('[data-combobox-selected]')!
    expect(highlighted).not.toBeNull()
    expect(getComputedStyle(highlighted).color).toBe('rgb(20, 21, 28)')
  },
}

export const MenuDropdown: Story = {
  render: () => <Menu><Menu.Target><Button>Actions</Button></Menu.Target><Menu.Dropdown>
    <Menu.Item>View roster</Menu.Item>
    <Menu.Item><Anchor component="span">Review lineup</Anchor></Menu.Item>
  </Menu.Dropdown></Menu>,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Actions' }))
    const menu = await within(canvasElement.ownerDocument.body).findByRole('menu')
    expect(getComputedStyle(menu).backgroundColor).toBe('rgb(56, 47, 38)')
    expect(getComputedStyle(menu).borderTopColor).toBe('rgb(107, 92, 76)')
    expect(getComputedStyle(within(menu).getByText('Review lineup')).color).toBe('rgb(205, 146, 111)')
  },
}
