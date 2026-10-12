import { Badge, Tooltip } from '@mantine/core'

interface Props {
  label: string
  tooltip?: string
  color?: string
  variant?: 'filled' | 'light' | 'outline'
  size?: 'xs' | 'sm'
}

export function BadgeSlot({ label, tooltip, color = 'gray', variant = 'light', size = 'xs' }: Props) {
  const badge = (
    <Badge color={color} variant={variant} size={size}>
      {label}
    </Badge>
  )
  return tooltip ? <Tooltip label={tooltip}>{badge}</Tooltip> : badge
}
