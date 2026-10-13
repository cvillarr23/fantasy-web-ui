import { BadgeSlot } from '../ui/BadgeSlot'

// sentiment is a schema-free string on the backend (see fantasy-core-pipeline's README:
// rumor_signals) - fall back to the raw string for anything unrecognized, same approach
// InjuryBadge takes for injury_status.
const SENTIMENT_BADGES: Record<string, { label: string; color: string }> = {
  positive: { label: 'Trending up', color: 'green' },
  negative: { label: 'Trending down', color: 'red' },
}

interface Props {
  sentiment: string | null
  confidence: number | null
  suggestedAction: string | null
}

export function RumorBadge({ sentiment, confidence, suggestedAction }: Props) {
  if (!sentiment) return null
  const badge = SENTIMENT_BADGES[sentiment] ?? { label: sentiment, color: 'gray' }
  const confidenceLabel = confidence !== null ? `${Math.round(confidence * 100)}% confidence` : null
  const tooltip = [confidenceLabel, suggestedAction?.replaceAll('_', ' ')].filter(Boolean).join(' · ')

  return <BadgeSlot label={badge.label} tooltip={tooltip || badge.label} color={badge.color} />
}
