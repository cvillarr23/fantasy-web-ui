import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Anchor, Skeleton, Text } from '@mantine/core'
import { Link, useLocation, useParams } from 'react-router-dom'
import { queryClient } from '../api/queryClient'
import type { GameDetailResponse } from '../api/types'
import { matchupGameQuery } from '../api/weekReads'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { useOpenGame } from '../hooks/useOpenGame'
import { useOpenScoringGuide } from '../hooks/useOpenScoringGuide'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { FantasySplit } from './game/FantasySplit'
import { GameHeader } from './game/GameHeader'
import { GamePlayerList } from './game/GamePlayerList'
import { GamePlays } from './game/GamePlays'
import { PlayerSummaryPopover } from './player/PlayerSummaryPopover'
import { PageSkeleton, SkeletonRegion, TextSkeleton } from './skeletons'
import { EmptyState } from './ui/EmptyState'
import { ErrorAlert } from './ui/ErrorAlert'
import { LeagueNotConfigured } from './ui/LeagueNotConfigured'
import { PageHeader } from './ui/PageHeader'

const TITLE = 'Game details'

function GameSkeleton() {
  return (
    <SkeletonRegion label="Loading game">
      <Skeleton height={96} radius={8} my="md" />
      <Skeleton height={72} radius={8} mb="md" />
      <TextSkeleton lines={6} />
    </SkeletonRegion>
  )
}

/** Core answered 404: it has no snapshot of this game for the week. */
function NoLiveData() {
  return (
    <>
      <EmptyState tone="alert">No live data for this game this week.</EmptyState>
      <Text size="sm" c="dimmed" mt="xs">Game details are available while core is tracking this week's games.</Text>
    </>
  )
}

function GameDetail({ detail, onOpenPlayer }: { detail: GameDetailResponse; onOpenPlayer: (playerId: string) => void }) {
  const { status } = detail.game
  return (
    <div className="game-detail">
      <GameHeader game={detail.game} />
      <FantasySplit mine={detail.mine_points} theirs={detail.theirs_points} />
      <div className="game-detail-columns">
        <GamePlayerList players={detail.players} status={status} onOpenPlayer={onOpenPlayer} />
        <GamePlays key={detail.game.event_id} plays={detail.plays} status={status} onOpenPlayer={onOpenPlayer} />
      </div>
    </div>
  )
}

/** The popover opened from this page. Following one of its links closes it first, since the
 * game it links to can be the page already shown. */
function GamePagePopover({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const openGame = useOpenGame()
  const openScoringGuide = useOpenScoringGuide()
  const closeThen = (go: () => void) => {
    onClose()
    go()
  }
  return (
    <PlayerSummaryPopover
      playerId={playerId}
      onClose={onClose}
      onOpenGame={(eventId) => closeThen(() => openGame(eventId))}
      onOpenScoringGuide={() => closeThen(openScoringGuide)}
    />
  )
}

/** One NFL game of the matchup week: the score, each side's fantasy points from it, the players
 * and their plays. */
export function GameDetailsPage() {
  const { eventId = '' } = useParams()
  const { search } = useLocation()
  const { config, loading: configLoading } = useDraftConfig()
  const [week] = useSelectedWeek()
  const query = useQuery(matchupGameQuery(config, Number(week), eventId), queryClient)
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null)

  if (!config.league_id || !config.team_id) {
    if (configLoading) return <PageSkeleton title={TITLE} />
    return <LeagueNotConfigured title={TITLE} />
  }

  const detail = query.data
  const error = query.error ? String(query.error) : null

  return (
    <div className="dashboard">
      <Anchor component={Link} to={`/matchup${search}`} size="sm">← Matchup</Anchor>
      <PageHeader title={TITLE} level={1} subtitle={week ? `Week ${week}` : undefined} />
      {error && (
        <ErrorAlert my="md" onRetry={() => void query.refetch()}>
          {detail ? `Could not refresh this game. Showing the last data loaded. ${error}` : error}
        </ErrorAlert>
      )}
      {detail === null && <NoLiveData />}
      {query.isPending && <GameSkeleton />}
      {detail && <GameDetail detail={detail} onOpenPlayer={setOpenPlayerId} />}
      {openPlayerId && <GamePagePopover playerId={openPlayerId} onClose={() => setOpenPlayerId(null)} />}
    </div>
  )
}
