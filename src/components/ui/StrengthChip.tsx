import { InfoTip } from './InfoTip'
import { tradeGlossary } from '../tradeScore/tradeGlossary'

export interface StrengthChipProps {
  value: number | null | undefined
  label?: string
}

export function StrengthChip({ value, label = 'Strength' }: StrengthChipProps) {
  const known = value != null && Number.isFinite(value)
  const state = !known ? 'unknown' : value >= 0.5 ? 'strong' : value <= -0.5 ? 'weak' : 'average'
  const signed = known ? `${value > 0 ? '+' : ''}${value.toFixed(1)}` : ''
  return (
    <span className={`strength-chip strength-chip-${state}`}>
      <span>{label} {known ? `${state === 'strong' ? '▲ ' : state === 'weak' ? '▼ ' : ''}${signed} ${state}` : 'unknown'}</span>
      <InfoTip label={label.toLowerCase()}>{tradeGlossary.strength}</InfoTip>
    </span>
  )
}
