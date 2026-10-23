import type { ReactNode } from 'react'
import { Group, Text } from '@mantine/core'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  /** Controls on the right, such as a Refresh button or quick links. */
  actions?: ReactNode
  level?: 1 | 2 | 3
}

/** A page or panel heading with an optional subtitle and right-aligned actions. */
export function PageHeader({ title, subtitle, actions, level = 2 }: Props) {
  const Heading = `h${level}` as const
  return (
    <Group justify="space-between" className="page-header">
      <div>
        <Heading>{title}</Heading>
        {subtitle != null && <Text c="dimmed" size="sm">{subtitle}</Text>}
      </div>
      {actions}
    </Group>
  )
}
