import type { ReactNode } from 'react'
import { Button, Group, Text, type ButtonProps } from '@mantine/core'

interface Props {
  onPrevious: () => void
  onNext: () => void
  previousDisabled: boolean
  nextDisabled: boolean
  /** Text between the buttons, such as "1–50 of 120". */
  summary?: ReactNode
  buttonVariant?: ButtonProps['variant']
}

/** Previous/Next paging for offset-based lists. Callers own the offset and decide when
 * there's another page, because endpoints report totals differently. */
export function Pager({ onPrevious, onNext, previousDisabled, nextDisabled, summary, buttonVariant }: Props) {
  return (
    <Group>
      <Button variant={buttonVariant} disabled={previousDisabled} onClick={onPrevious}>
        Previous
      </Button>
      {summary != null && <Text size="sm">{summary}</Text>}
      <Button variant={buttonVariant} disabled={nextDisabled} onClick={onNext}>
        Next
      </Button>
    </Group>
  )
}
