import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, List, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { queryClient } from '../api/queryClient'
import { getTradeCandidates, getWaiverRecommendations } from '../api/client'
import { byeOutlookQuery } from '../api/weekReads'
import type { TradeCandidate } from '../api/tradeCandidateTypes'
import type { DraftConfig, TeamByeOutlook, WaiverRecommendation } from '../api/types'
import { byeFillIns, byeTradeFixes, FIXES_SHOWN } from './byeFixes'



function crunchReason(week: TeamByeOutlook['weeks'][number]) {
  if (week.unfilled_slots.length)
    return `leaves ${week.unfilled_slots.join(', ')} ${week.unfilled_slots.length > 1 ? 'slots' : 'slot'} empty`
  return 'forces a below-replacement starter'
}

/** The best picks for the crunch weeks. `undefined` is still loading; a failed read hides its panel. */
export interface ByeFixes {
  waivers: WaiverRecommendation[] | undefined | null
  trades: TradeCandidate[] | undefined | null
}

const joinNames = (players: { name: string | null; espn_id: string }[]) => players.map((player) => player.name || player.espn_id).join(' + ')

function FixPanel({ title, hint, seeAll, children }: {
  title: string; hint: string; seeAll: { label: string; to: string }; children: ReactNode
}) {
  return (
    <div className="bye-fix">
      <div className="bye-fix-heading"><strong>{title}</strong> <Text span size="xs" c="dimmed">{hint}</Text></div>
      {children}
      <Button component={Link} to={seeAll.to} size="xs" variant="outline" className="action-link">{seeAll.label}</Button>
    </div>
  )
}

function WaiverFixes({ waivers, to }: { waivers: ByeFixes['waivers']; to: string }) {
  if (waivers === null) return null
  return (
    <FixPanel title="Waiver fill-ins" hint={`top ${FIXES_SHOWN}`} seeAll={{ label: 'See all fill-ins', to }}>
      {waivers === undefined ? <Text size="sm" c="dimmed">Loading fill-ins…</Text>
        : waivers.length === 0 ? <Text size="sm" c="dimmed">No free agents found for these weeks.</Text>
        : waivers.map((rec) => (
          <Link key={rec.free_agent.espn_id ?? rec.free_agent.name} to={to} className="bye-fix-row">
            <span>
              <strong>{rec.free_agent.name}</strong>
              <small>{[rec.position, rec.free_agent.pro_team].filter(Boolean).join(' · ')} · free agent</small>
            </span>
            <span className="bye-fix-value" title={`Lineup gain in week ${rec.bye_fill?.week}`}>
              +{(rec.bye_fill?.lineup_gain ?? 0).toFixed(1)} VORP
            </span>
          </Link>
        ))}
    </FixPanel>
  )
}

function TradeFixes({ trades, to }: { trades: ByeFixes['trades']; to: string }) {
  if (trades === null) return null
  return (
    <FixPanel title="Trade targets" hint={`top ${FIXES_SHOWN}`} seeAll={{ label: 'See all trades', to }}>
      {trades === undefined ? <Text size="sm" c="dimmed">Loading trades…</Text>
        : trades.length === 0 ? <Text size="sm" c="dimmed">No proposable trades fix these weeks.</Text>
        : trades.map((trade) => (
          <Link key={trade.candidate_key} to={to} className="bye-fix-row">
            <span>
              <strong>{trade.counterparty.name}</strong>
              <small>Get {joinNames(trade.receive)} for {joinNames(trade.send)}</small>
            </span>
            <span className={`finder-status finder-status-${trade.status}`}>
              {trade.status === 'proposable' ? '✓ Proposable' : 'Needs a drop'}
            </span>
          </Link>
        ))}
    </FixPanel>
  )
}

/** Weeks ahead where our players' NFL byes leave the lineup short. Shown only when there is one;
 * fixes are recommendations on the waiver and trade pages, never automatic. */
export function ByeCrunchSummary({ outlook, fixes }: { outlook: TeamByeOutlook; fixes?: ByeFixes }) {
  const crunch = outlook.weeks.filter((week) => week.crunch)
  if (!crunch.length) return null
  const names = new Map(outlook.players.map((player) => [player.espn_id, player.name ?? `ESPN player ${player.espn_id}`]))
  return (
    <Alert color="orange" mb="md" title="Bye-week crunch ahead" id="bye-crunch">
      <List size="sm" spacing={2} mb="xs">
        {crunch.map((week) => (
          <List.Item key={week.week}>
            <Text span fw={600}>Week {week.week}</Text>
            {`: ${week.on_bye.map((id) => names.get(id) ?? id).join(', ')} on bye ${crunchReason(week)}.`}
          </List.Item>
        ))}
      </List>
      {fixes ? (
        <div className="bye-fixes">
          <WaiverFixes waivers={fixes.waivers} to={`/waivers?week=${outlook.start_week}`} />
          <TradeFixes trades={fixes.trades} to={`/trades?week=${outlook.start_week}#finder`} />
        </div>
      ) : (
        <div className="bye-fix-links">
          <Button component={Link} to={`/waivers?week=${outlook.start_week}`} size="xs" variant="outline" className="action-link">
            See all fill-ins
          </Button>
          <Button component={Link} to={`/trades?week=${outlook.start_week}#finder`} size="xs" variant="outline" className="action-link">
            See all trades
          </Button>
        </div>
      )}
    </Alert>
  )
}

/** Best-effort, like the matchup banner: a failed outlook hides the banner, never the page, and a
 * failed fix list hides only its own panel. */
export function ByeCrunchBanner({ config, week }: { config: DraftConfig; week: number }) {
  const query = useQuery(byeOutlookQuery(config, week), queryClient)
  const outlook = Array.isArray(query.data?.weeks) ? query.data : null
  const crunchWeeks = outlook?.weeks.filter((w) => w.crunch).map((w) => w.week) ?? []
  const hasCrunch = crunchWeeks.length > 0

  // Same key as the waiver page, so a visit there reuses this read.
  const waivers = useQuery({
    queryKey: ['waiver-recommendations', config.league_id, config.season, week],
    queryFn: () => getWaiverRecommendations(config.season, week),
    enabled: hasCrunch,
  }, queryClient)
  const trades = useQuery({
    queryKey: ['bye-trade-fixes', config.league_id, config.team_id, config.season, week],
    queryFn: ({ signal }) => getTradeCandidates(
      { league_id: config.league_id, season: config.season, week, status: 'proposable', sort: 'final_score', limit: 25 },
      signal,
    ),
    enabled: hasCrunch,
  }, queryClient)

  if (!outlook) return null
  const fixes: ByeFixes = {
    waivers: waivers.isError ? null : waivers.data ? byeFillIns(waivers.data.recommendations, crunchWeeks) : undefined,
    trades: trades.isError ? null : trades.data ? byeTradeFixes(trades.data.items, crunchWeeks) : undefined,
  }
  return <ByeCrunchSummary outlook={outlook} fixes={fixes} />
}
