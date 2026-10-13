import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@mantine/core'
import { PageHeader } from './PageHeader'

const meta = {
  title: 'UI/PageHeader',
  component: PageHeader,
  args: { title: 'Activity', subtitle: 'Follow background work from request to verified result.', level: 2 },
  argTypes: { level: { control: 'inline-radio', options: [1, 2, 3] } },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const WithAction: Story = { args: { actions: <Button variant="default">Refresh</Button> } }
export const TitleOnly: Story = { args: { subtitle: undefined } }
