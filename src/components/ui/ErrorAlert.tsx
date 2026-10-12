import type { ReactNode } from 'react'
import { Alert, Button, type AlertProps } from '@mantine/core'

interface Props extends Omit<AlertProps, 'color' | 'children'> {
  children: ReactNode
  /** Adds a Retry button inside the alert. */
  onRetry?: () => void
}

/** A failed load or action. Use it instead of an empty state, so a failure never reads as
 * "nothing here". */
export function ErrorAlert({ children, onRetry, ...alertProps }: Props) {
  return (
    <Alert color="red" {...alertProps}>
      {children}
      {onRetry && <Button variant="subtle" onClick={onRetry}>Retry</Button>}
    </Alert>
  )
}
