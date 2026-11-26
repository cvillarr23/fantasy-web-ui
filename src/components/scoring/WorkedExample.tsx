import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Anchor, NativeSelect, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { queryClient } from '../../api/queryClient'
import type { DraftConfig, ScoringRule } from '../../api/types'
import { matchupQuery } from '../../api/weekReads'
import { useDraftConfig } from '../../hooks/useDraftConfig'
import { useSelectedWeek } from '../../hooks/useSelectedWeek'
import { BreakdownTable } from '../player/BreakdownTable'
import { breakdownTotal, formatPoints } from '../player/popoverFormat'
import { SkeletonRegion, TextSkeleton } from '../skeletons'
import { EmptyState } from '../ui/EmptyState'
import { ErrorAlert } from '../ui/ErrorAlert'
import { defaultExampleId, examplePlayers, multiplyStep, type ExamplePlayer, type ExamplePlayers } from './workedExample'

function isConfigured(config: DraftConfig): boolean {
  return Boolean(config.league_id && config.team_id)
}

/** This week's matchup, for the players to pick from and their breakdowns. */
function useExampleMatchup() {
  const { config, loading } = useDraftConfig()
  const [week] = useSelectedWeek()
  const query = useQuery(matchupQuery(config, Number(week)), queryClient)
  const needsSetup = !loading && !isConfigured(config)
  // Without a week (off-season, or it hasn't loaded) the matchup is never requested.
  const waiting = !needsSetup && Number(week) > 0 && query.isPending
  return { query, needsSetup, waiting }
}

function options(label: string, players: ExamplePlayer[]) {
  return players.length ? [{ group: label, items: players.map((p) => ({ value: p.id, label: p.name })) }] : []
}

interface PickerProps {
  players: ExamplePlayers
  value: string
  onChange: (id: string) => void
}

function PlayerSelect({ players, value, onChange }: PickerProps) {
  return (
    <NativeSelect
      label="Player"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      data={[...options('Your team', players.mine), ...options('Opponent', players.theirs)]}
    />
  )
}

/** The four steps from stats to a matchup score, using the picked player's numbers if any. */
function Steps({ player, rules }: { player: ExamplePlayer | null; rules: ScoringRule[] }) {
  const sum = player ? multiplyStep(player, rules) : null
  const total = player ? formatPoints(breakdownTotal(player.lines)) : null
  return (
    <ol className="scoring-steps" aria-label="How a score adds up">
      <li>Take each stat the player recorded this week.</li>
      <li>
        Multiply it by the league's rule{sum ? <> (e.g. <span className="num">{sum}</span>)</> : ' for that stat'}.
      </li>
      <li>Add them up. That's the player's fantasy score{total ? `: ${total}` : ''}.</li>
      <li>Your matchup score is the sum of your <strong>starters</strong> only. Bench points don't count.</li>
    </ol>
  )
}

export function WorkedExample({ rules }: { rules: ScoringRule[] }) {
  const { query, needsSetup, waiting } = useExampleMatchup()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const players = query.data ? examplePlayers(query.data) : { mine: [], theirs: [] }
  const all = [...players.mine, ...players.theirs]
  // A pick may drop out between polls or weeks, so it falls back to the default.
  const player = all.find((p) => p.id === pickedId) ?? all.find((p) => p.id === defaultExampleId(players)) ?? null
  return (
    <>
      {needsSetup && (
        <EmptyState>
          <Anchor component={Link} to="/settings" size="sm">Set your league and team</Anchor> to see an example from your matchup.
        </EmptyState>
      )}
      {query.error && (
        <ErrorAlert onRetry={() => void query.refetch()}>Could not load your matchup. {String(query.error)}</ErrorAlert>
      )}
      {waiting && (
        <SkeletonRegion label="Loading example"><TextSkeleton lines={4} /></SkeletonRegion>
      )}
      {query.data === null && <EmptyState>No matchup this week, so there is no player to show.</EmptyState>}
      {query.data && !player && (
        <EmptyState>No player in this matchup has scored yet. An example appears once games are under way.</EmptyState>
      )}
      {player && (
        <>
          <PlayerSelect players={players} value={player.id} onChange={setPickedId} />
          <Text size="sm" fw={600}>{player.name}, this week</Text>
          <BreakdownTable lines={player.lines} />
        </>
      )}
      <Steps player={player} rules={rules} />
    </>
  )
}
