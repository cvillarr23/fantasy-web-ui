import type { EspnOwnership } from '../../api/types'
import { espnTooltip, formatChange, formatPosRank, hasEspnData, isCold } from './espnMarket'

interface Props {
  position?: string | null
  espn?: EspnOwnership | null
}

function formatPercent(value: number | null): string | null {
  return value === null ? null : `${Math.round(value)}%`
}

/** ESPN's league-wide market signal under a player's name; renders nothing without data. */
export function EspnMarketLine({ position, espn }: Props) {
  if (!hasEspnData(espn)) return null
  const rank = formatPosRank(position, espn.pos_rank)
  const started = formatPercent(espn.percent_started)
  const bench = formatPercent(espn.percent_bench)
  const change = formatChange(espn.percent_change)
  const parts = [
    rank && <b key="rank">{rank}</b>,
    started && (
      <span key="start">
        <b className="espn-start">{started}</b> start
      </span>
    ),
    bench && <span key="bench">{bench} bench</span>,
    change && (
      <span key="change" className={`espn-change-${change.tone}`}>
        {change.text}
      </span>
    ),
  ].filter(Boolean)

  return (
    <span className={`espn-line${isCold(espn) ? ' espn-cold' : ''}`}>
      <span className="espn-tag" title={espnTooltip(espn)}>
        ESPN
      </span>
      {parts.map((part, i) => (
        <span key={i} className="espn-part">
          {i > 0 && <span className="espn-sep" aria-hidden="true">|</span>}
          {part}
        </span>
      ))}
    </span>
  )
}
