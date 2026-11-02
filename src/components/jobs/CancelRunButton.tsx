import { useState } from 'react'
import { Button } from '@mantine/core'
import { useCancelRun } from '../../hooks/useJobControls'
import { CancelRunDialog } from './CancelRunDialog'

interface Props {
  runId: string
  job: string
  chainRoot?: boolean
  label?: string
  className?: string
}

/** A Cancel button for one queued or running run, with its confirmation. */
export function CancelRunButton({ runId, job, chainRoot, label = 'Cancel', className }: Props) {
  const [opened, setOpened] = useState(false)
  const cancel = useCancelRun()
  const close = () => {
    setOpened(false)
    cancel.reset()
  }
  return (
    <>
      <Button
        variant="light"
        color="red"
        size="xs"
        className={className}
        aria-label={`${label}, ${job}`}
        onClick={() => setOpened(true)}
      >
        {label}
      </Button>
      <CancelRunDialog
        opened={opened}
        job={job}
        chainRoot={chainRoot}
        cancelling={cancel.isPending}
        error={cancel.error}
        onConfirm={() => cancel.mutate(runId, { onSuccess: close })}
        onClose={close}
      />
    </>
  )
}
