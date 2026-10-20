import type { ReactNode } from 'react'
import { signedScore } from '../tradeScore/tradeScoreFormat'
import { InfoTip } from './InfoTip'

export interface StatTileProps {
  label: string
  value: number | null | undefined
  info?: ReactNode
  caption?: ReactNode
  precision?: number
}

export function StatTile({ label, value, info, caption, precision = 1 }: StatTileProps) {
  const known = value != null && Number.isFinite(value)
  const tone = !known || Math.abs(value) <= 0.05 ? 'neutral' : value > 0 ? 'positive' : 'negative'
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">{label} {info && <InfoTip label={label.toLowerCase()}>{info}</InfoTip>}</div>
      <div className={`stat-tile-value stat-tile-${tone}`}>{signedScore(known ? value : null, precision)}</div>
      {caption && <div className="stat-tile-caption">{caption}</div>}
    </div>
  )
}
