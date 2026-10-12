import type { ReactNode } from 'react'
import { Alert, Text } from '@mantine/core'

interface Props {
  children: ReactNode
  /** `muted` is a dimmed line under a list or table; `alert` is a gray callout for a
   * whole page or panel with nothing to show. */
  tone?: 'muted' | 'alert'
}

/** A successful load that returned nothing. */
export function EmptyState({ children, tone = 'muted' }: Props) {
  if (tone === 'alert') return <Alert color="gray">{children}</Alert>
  return <Text size="sm" c="dimmed">{children}</Text>
}
