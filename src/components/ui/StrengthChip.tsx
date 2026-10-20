import { InfoTip } from './InfoTip'
import { tradeGlossary } from '../tradeScore/tradeGlossary'
import { signedScore } from '../tradeScore/tradeScoreFormat'

export interface StrengthChipProps {
  value: number | null | undefined
  label?: string
  /** Opt into help for standalone chips; tables explain strength once in the header. */
  info?: boolean
}

export function StrengthChip({ value, label = 'Strength', info = false }: StrengthChipProps) {
  const known = value != null && Number.isFinite(value)
  const displayed = known ? Number(value.toFixed(2)) : null
  const state = displayed == null ? 'unknown' : displayed >= 0.5 ? 'strong' : displayed <= -0.5 ? 'weak' : 'average'
  const tone = !known || Math.abs(value) <= 0.05 ? 'neutral' : value > 0 ? 'positive' : 'negative'
  const arrow = displayed == null || displayed === 0 ? '' : displayed > 0 ? '▲ ' : '▼ '
  return (
    <span className={`strength-chip strength-chip-${state} strength-chip-${tone}`}>
      <span>{label} {displayed == null ? 'unknown' : `${arrow}${signedScore(displayed, 2)} ${state}`}</span>
      {info && <InfoTip label={label.toLowerCase()}>{tradeGlossary.strength}</InfoTip>}
    </span>
  )
}
