import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table } from '@mantine/core'
import { formatNumber, type FormatNumberOptions } from './formatNumber'

function FormatTable({ options }: { options: FormatNumberOptions }) {
  const values = [12.345, 3.5, 0, -4.4, null]
  return (
    <Table w={320}>
      <Table.Thead><Table.Tr><Table.Th>Value</Table.Th><Table.Th>Shown as</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody>
        {values.map((v) => (
          <Table.Tr key={String(v)}><Table.Td>{String(v)}</Table.Td><Table.Td>{formatNumber(v, options)}</Table.Td></Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}

/** `formatNumber(value, options)` formats stats in tables and cards. Unknown values show "—". */
const meta = {
  title: 'UI/formatNumber',
  component: FormatTable,
  args: { options: { digits: 1, signed: false, signZero: false, unknown: '—' } },
} satisfies Meta<typeof FormatTable>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {}
export const Signed: Story = { args: { options: { signed: true } } }
export const SignedWithZero: Story = { args: { options: { signed: true, signZero: true } } }
