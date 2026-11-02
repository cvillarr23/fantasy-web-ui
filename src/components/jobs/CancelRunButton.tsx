import { useState } from 'react'
import { Button } from '@mantine/core'
import { useCancelRun } from '../../hooks/useJobControls'
import { isActiveRun } from '../runFormat'
import { CancelRunDialog } from './CancelRunDialog'

interface ButtonProps {
  job: string
  label?: string
  className?: string
}

/** The red Cancel button, named for its job so a screen reader can tell rows apart. */
export function CancelButton({ job, label = 'Cancel', className, onClick }: ButtonProps & { onClick: () => void }) {
  return (
    <Button variant="light" color="red" size="xs" className={className} aria-label={`${label}, ${job}`} onClick={onClick}>
      {label}
    </Button>
  )
}

interface ConfirmProps {
  /** The run being cancelled; the dialog is open while this is set. */
  runId: string | null
  job: string
  chainRoot?: boolean
  onClose: () => void
}

/** Asks before cancelling a run, and keeps a refusal on screen until it is closed. */
export function CancelRunConfirm({ runId, job, chainRoot, onClose }: ConfirmProps) {
  const cancel = useCancelRun()
  const close = () => {
    cancel.reset()
    onClose()
  }
  return (
    <CancelRunDialog
      opened={runId !== null}
      job={job}
      chainRoot={chainRoot}
      cancelling={cancel.isPending}
      error={cancel.error}
      onConfirm={() => runId && cancel.mutate(runId, { onSuccess: close })}
      onClose={close}
    />
  )
}

interface Props extends ButtonProps {
  run: { id: string; status: string } | null | undefined
  chainRoot?: boolean
}

/** Cancel for a queued or running run, with its confirmation. The button goes once the run
 * ends, but an open dialog stays: a refused cancel refreshes the page, which usually shows
 * the run ended, and the refusal still needs reading. The run is fixed when the dialog
 * opens, so a newer run arriving meanwhile isn't the one cancelled. */
export function CancelRunButton({ run, chainRoot, ...button }: Props) {
  const [target, setTarget] = useState<string | null>(null)
  return (
    <>
      {run && isActiveRun(run.status) && <CancelButton {...button} onClick={() => setTarget(run.id)} />}
      <CancelRunConfirm runId={target} job={button.job} chainRoot={chainRoot} onClose={() => setTarget(null)} />
    </>
  )
}
