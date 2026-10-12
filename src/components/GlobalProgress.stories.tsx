import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { expect, userEvent, waitFor } from 'storybook/test'
import { queryClient } from '../api/queryClient'
import { GlobalProgress } from './GlobalProgress'

function SlowQuery() {
  const [run, setRun] = useState(0)
  const query = useQuery(
    {
      queryKey: ['story-slow', run],
      queryFn: () => new Promise((resolve) => setTimeout(() => resolve(run), 1500)),
      enabled: run > 0,
    },
    queryClient,
  )
  return (
    <>
      <GlobalProgress />
      <Button onClick={() => setRun((n) => n + 1)}>Start a slow query</Button>
      <Text size="sm" mt="sm">{query.isFetching ? 'Fetching…' : 'Idle'}</Text>
    </>
  )
}

/** The top-of-page bar shows for any query or mutation still running after 200 ms. */
const meta = {
  title: 'Status/GlobalProgress',
  component: GlobalProgress,
  render: () => <SlowQuery />,
} satisfies Meta<typeof GlobalProgress>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Fetching: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Start a slow query' }))
    await waitFor(() => expect(canvas.getByText('Fetching…')).toBeVisible())
  },
}
