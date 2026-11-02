import { useState } from 'react'
import { Anchor, Button, Group, Text } from '@mantine/core'
import { grafanaLogsUrl } from './grafanaLogs'

interface Props {
  baseUrl: string
  run: Parameters<typeof grafanaLogsUrl>[1]
}

/** The run's full logs in Grafana. The embed is opt-in because Google sign-in refuses to
 * load inside a frame, so it only works for someone already signed in to Grafana. */
export function GrafanaLogs({ baseUrl, run }: Props) {
  const [embedded, setEmbedded] = useState(false)
  const url = grafanaLogsUrl(baseUrl, run)
  if (!url) return null
  return (
    <>
      <Group gap="sm" mt="sm">
        <Button component="a" href={url} target="_blank" rel="noreferrer" variant="default" size="xs">
          Open in Grafana
        </Button>
        <Button variant="default" size="xs" aria-expanded={embedded} onClick={() => setEmbedded(!embedded)}>
          {embedded ? 'Hide Grafana logs' : 'Show Grafana logs here'}
        </Button>
        <Text size="xs">Every log line from this run's pod, for the run's time range.</Text>
      </Group>
      {embedded && (
        <div className="grafana-embed">
          <iframe title="Grafana logs for this run" src={grafanaLogsUrl(baseUrl, run, { embed: true }) ?? undefined} loading="lazy" />
          <Text size="xs">
            Blank or asking you to sign in? Google won't load inside a panel.{' '}
            <Anchor href={url} target="_blank" rel="noreferrer">Open Grafana</Anchor> and sign in there first.
          </Text>
        </div>
      )}
    </>
  )
}
