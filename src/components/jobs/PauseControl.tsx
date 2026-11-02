import { useState } from 'react'
import { Button } from '@mantine/core'
import type { PauseInfo } from '../../api/jobs'
import { usePauseJob, useResumeJob } from '../../hooks/useJobControls'
import { ErrorAlert } from '../ui/ErrorAlert'
import { pauseIsActive, pauseText } from './jobsFormat'
import { PauseDialog, type PauseTarget } from './PauseDialog'

interface Props {
  name: string
  pause: PauseInfo | null | undefined
  target: PauseTarget
  now?: Date
}

/** A pause in force, with a Resume button. It owns the resume, so a failed resume's error
 * goes when the pause does and doesn't come back with the next one. */
function ActivePause({ name, pause, target, now }: Props & { pause: PauseInfo }) {
  const resume = useResumeJob()
  return (
    <div className="job-note job-note-paused">
      <span>{pauseText(pause, now)}</span>
      <Button variant="default" size="xs" loading={resume.isPending} onClick={() => resume.mutate(name)}>
        {target === 'chain' ? 'Resume chain' : 'Resume'}
      </Button>
      {resume.error && <ErrorAlert>Not resumed: {resume.error.message}</ErrorAlert>}
    </div>
  )
}

/** A Pause… button and the dialog it opens. */
function PauseButton({ name, target }: Pick<Props, 'name' | 'target'>) {
  const [opened, setOpened] = useState(false)
  const pausing = usePauseJob()
  const close = () => {
    setOpened(false)
    pausing.reset()
  }
  return (
    <>
      <Button variant="default" size="xs" className="job-pause-button" onClick={() => setOpened(true)}>
        {target === 'chain' ? 'Pause chain…' : 'Pause…'}
      </Button>
      <PauseDialog
        opened={opened}
        name={name}
        target={target}
        pausing={pausing.isPending}
        error={pausing.error}
        onConfirm={(request) => pausing.mutate({ name, request }, { onSuccess: close })}
        onClose={close}
      />
    </>
  )
}

/** A job's or chain's pause: what it is and a Resume button while paused, else Pause…. */
export function PauseControl({ pause, ...props }: Props) {
  if (pause && pauseIsActive(pause, props.now)) return <ActivePause pause={pause} {...props} />
  return <PauseButton name={props.name} target={props.target} />
}
