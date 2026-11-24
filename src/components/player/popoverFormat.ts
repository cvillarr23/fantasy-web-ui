import type { NewsSource, ScoreBreakdownLine, WeeklyPoints } from '../../api/types'

export const NEWS_SOURCES: Record<NewsSource, { label: string; chip: string; color: string }> = {
  espn_news: { label: 'ESPN', chip: 'E', color: 'red' },
  bluesky: { label: 'Bluesky', chip: 'B', color: 'blue' },
  rotowire: { label: 'RotoWire', chip: 'R', color: 'yellow' },
  reddit: { label: 'r/fantasyfootball', chip: 'r/', color: 'orange' },
}

/** "just now", "42m", "3h" or "2d" since `iso`; a future timestamp reads as "just now". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / (60 * 24))}d`
}

export function formatPoints(points: number | null | undefined, signed = false): string {
  if (points == null) return '—'
  const text = (Math.round(points * 10) / 10).toFixed(1).replace('-', '−')
  return signed && points > 0 ? `+${text}` : text
}

export function breakdownTotal(lines: ScoreBreakdownLine[]): number {
  return lines.reduce((sum, line) => sum + line.points, 0)
}

/** Mean of the weeks that have a score; null when none do, since an average of nothing is not 0. */
export function weeklyAverage(log: WeeklyPoints[]): number | null {
  const scored = log.filter((w): w is { week: number; points: number } => w.points != null)
  return scored.length ? scored.reduce((sum, w) => sum + w.points, 0) / scored.length : null
}
