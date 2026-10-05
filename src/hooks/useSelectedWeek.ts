import { useSearchParams } from 'react-router-dom'
import { useCurrentWeek } from './useCurrentWeek'

export function validWeek(value: unknown): number | null {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 18 ? n : null
}
/** URL is the explicit selection; absence means follow the live league week. */
export function useSelectedWeek(): [number | string, (week: number | string) => void] {
  const [params, setParams] = useSearchParams()
  const current = useCurrentWeek()
  const selected = validWeek(params.get('week'))
  return [
    selected ?? current ?? '',
    (value) => {
      setParams((previous) => {
        const next = new URLSearchParams(previous)
        const week = validWeek(value)
        if (week === null) next.delete('week')
        else next.set('week', String(week))
        return next
      })
    },
  ]
}
