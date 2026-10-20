import { useState } from 'react'
import { Alert, Anchor, CloseButton, Group, Text } from '@mantine/core'

interface Props {
  title: string
  issueUrl: string
}

export function RoadmapBanner({ title, issueUrl }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <Alert variant="light" color="clay" mb="md" p="sm">
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm">
          {title} —{' '}
          <Anchor href={issueUrl} target="_blank" rel="noreferrer">
            track progress
          </Anchor>
        </Text>
        <CloseButton onClick={() => setDismissed(true)} aria-label="Dismiss" />
      </Group>
    </Alert>
  )
}
