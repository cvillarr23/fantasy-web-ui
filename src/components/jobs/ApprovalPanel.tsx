import { useState } from 'react'
import { Button, Group, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { Run } from '../../api/runs'
import { useApproveRun, useDismissRun } from '../../hooks/useJobControls'
import { isWaitingRun, runStamp } from '../runFormat'
import { ApprovalDecisionDialog, type ApprovalDecision } from './ApprovalDecisionDialog'
import {
  approvalEnding,
  approvalLink,
  approvalThen,
  approvalTitle,
  decidableHere,
  thenText,
  type ApprovalLink,
} from './approvalRun'

function OpenLink({ link }: { link: ApprovalLink }) {
  if (link.internal) {
    return <Button component={Link} to={link.href} size="xs">Open</Button>
  }
  return <Button component="a" href={link.href} target="_blank" rel="noreferrer" size="xs">Open</Button>
}

/** Approve and Dismiss for an approval with no page of its own, each behind a confirmation.
 * The decision is fixed when its dialog opens, and a refusal stays on screen until closed. */
function DecisionButtons({ run, title, then }: { run: Run; title: string; then: string }) {
  const [decision, setDecision] = useState<ApprovalDecision | null>(null)
  const approve = useApproveRun()
  const dismiss = useDismissRun()
  const active = decision === 'dismiss' ? dismiss : approve
  const close = () => {
    approve.reset()
    dismiss.reset()
    setDecision(null)
  }
  return (
    <>
      <Group gap="xs">
        <Button size="xs" color="teal" aria-label={`Approve, ${title}`} onClick={() => setDecision('approve')}>Approve</Button>
        <Button size="xs" color="red" variant="light" aria-label={`Dismiss, ${title}`} onClick={() => setDecision('dismiss')}>Dismiss</Button>
      </Group>
      <ApprovalDecisionDialog
        opened={decision !== null}
        decision={decision ?? 'approve'}
        title={title}
        then={then}
        deciding={active.isPending}
        error={active.error}
        onConfirm={() => active.mutate(run.id, { onSuccess: close })}
        onClose={close}
      />
    </>
  )
}

/** What an approval run is waiting for: its title, what approving starts, when it expires and,
 * for a trade, a link to the page where it is decided. */
export function ApprovalPanel({ run }: { run: Run }) {
  const title = approvalTitle(run) || 'Needs your approval'
  const then = approvalThen(run)
  const link = approvalLink(run)
  const ending = approvalEnding(run)
  return (
    <section aria-label="Approval" className="approval-panel">
      <h3>{title}</h3>
      {then && <Text size="sm">Approving starts {thenText(then)}.</Text>}
      {isWaitingRun(run.status) && run.expires_at && (
        <Text size="sm">Waiting for you. Expires {runStamp(run.expires_at)}.</Text>
      )}
      {ending && (
        <Text size="sm">
          {ending}
          {run.requested_by && run.end_reason === 'approved' ? ` by ${run.requested_by}` : ''}.
        </Text>
      )}
      <Group gap="xs">
        {link && <OpenLink link={link} />}
        {decidableHere(run) && <DecisionButtons run={run} title={title} then={then ? thenText(then) : ''} />}
      </Group>
      {link && isWaitingRun(run.status) && (
        <Text size="xs" c="dimmed">Approve or dismiss it there, where you can review and edit it first.</Text>
      )}
    </section>
  )
}
