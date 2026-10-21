import type { ReactNode } from 'react'
import { scoreTone, signedScore } from '../tradeScore/tradeScoreFormat'
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
  const displayed = known ? Number(value.toFixed(precision)) : null
  const tone = scoreTone(displayed, precision)
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">{label} {info && <InfoTip label={label.toLowerCase()}>{info}</InfoTip>}</div>
      <div className={`stat-tile-value stat-tile-${tone}`}>{signedScore(displayed, precision)}</div>
      {caption && <div className="stat-tile-caption">{caption}</div>}
    </div>
  )
}
