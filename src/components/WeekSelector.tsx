import { ActionIcon, Button, Group, NativeSelect } from '@mantine/core'
import { useSearchParams } from 'react-router-dom'
interface Props {
  week: number | string
  onChange: (week: number) => void
  min?: number
  max?: number
}
export function WeekSelector({ week, onChange, min = 1, max = 18 }: Props) {
  const [params, setParams] = useSearchParams()
  const current = Number(week)
  const valid = Number.isInteger(current) && current >= min && current <= max
  return (
    <Group gap="xs" className="week-selector">
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Previous week"
        disabled={!valid || current <= min}
        onClick={() => onChange(current - 1)}
      >
        ‹
      </ActionIcon>
      <NativeSelect
        aria-label="Week"
        w={125}
        value={valid ? String(current) : ''}
        data={[
          { value: '', label: 'Select week' },
          ...Array.from({ length: max - min + 1 }, (_, i) => ({
            value: String(min + i),
            label: `Week ${min + i}`,
          })),
        ]}
        onChange={(e) => e.currentTarget.value && onChange(Number(e.currentTarget.value))}
      />
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Next week"
        disabled={!valid || current >= max}
        onClick={() => onChange(current + 1)}
      >
        ›
      </ActionIcon>
      {params.has('week') && (
        <Button
          variant="subtle"
          size="xs"
          onClick={() =>
            setParams((p) => {
              const next = new URLSearchParams(p)
              next.delete('week')
              return next
            })
          }
        >
          Current week
        </Button>
      )}
    </Group>
  )
}
