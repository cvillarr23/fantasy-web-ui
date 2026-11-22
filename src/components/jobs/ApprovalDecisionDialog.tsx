import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { ErrorAlert } from '../ui/ErrorAlert'

export type ApprovalDecision = 'approve' | 'dismiss'

interface Props {
  opened: boolean
  decision: ApprovalDecision
  title: string
  /** What approving starts, such as "set-lineup (week: 9)"; empty when it only lets a chain go on. */
  then: string
  deciding: boolean
  error: Error | null
  onConfirm: () => void
  onClose: () => void
}

function effect(decision: ApprovalDecision, then: string) {
  if (decision === 'dismiss') return "Nothing starts, and the steps that follow it are skipped."
  return then ? `Starts ${then} now.` : 'The steps that follow it go on.'
}

/** Stands between Approve or Dismiss and a decision that can't be taken back. */
export function ApprovalDecisionDialog({ opened, decision, title, then, deciding, error, onConfirm, onClose }: Props) {
  const approving = decision === 'approve'
  return (
    <Modal
      opened={opened}
      onClose={() => { if (!deciding) onClose() }}
      title={approving ? `Approve "${title}"?` : `Dismiss "${title}"?`}
      transitionProps={{ duration: 0 }}
    >
      <Stack>
        <Text size="sm">{effect(decision, then)}</Text>
        {error && <ErrorAlert>{approving ? 'Not approved' : 'Not dismissed'}: {error.message}</ErrorAlert>}
        <Group justify="flex-end">
          <Button variant="default" disabled={deciding} onClick={onClose}>Not yet</Button>
          <Button color={approving ? 'teal' : 'red'} loading={deciding} onClick={onConfirm}>
            {approving ? 'Approve' : 'Dismiss'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
