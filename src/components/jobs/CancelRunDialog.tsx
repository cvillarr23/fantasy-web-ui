import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { ErrorAlert } from '../ui/ErrorAlert'

interface Props {
  opened: boolean
  job: string
  /** The run is a chain root, so cancelling it stops the chain's active steps too. */
  chainRoot?: boolean
  cancelling: boolean
  error: Error | null
  onConfirm: () => void
  onClose: () => void
}

function cancelEffect(chainRoot: boolean) {
  if (chainRoot) return "Stops the steps that are queued or running now, and later steps won't start."
  return 'The launcher stops its pod or process.'
}

/** Stands between Cancel and a run that may be partway through changing something. */
export function CancelRunDialog({ opened, job, chainRoot = false, cancelling, error, onConfirm, onClose }: Props) {
  return (
    <Modal
      opened={opened}
      onClose={() => { if (!cancelling) onClose() }}
      title={chainRoot ? `Cancel the ${job} run?` : `Cancel this ${job} run?`}
      transitionProps={{ duration: 0 }}
    >
      <Stack>
        <Text size="sm">{cancelEffect(chainRoot)} Anything it already changed stays changed.</Text>
        {error && <ErrorAlert>Run not cancelled: {error.message}</ErrorAlert>}
        <Group justify="flex-end">
          <Button variant="default" disabled={cancelling} onClick={onClose}>Keep running</Button>
          <Button color="red" loading={cancelling} onClick={onConfirm}>Cancel run</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
