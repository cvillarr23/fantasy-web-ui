import { useCurrentWeek } from '../hooks/useCurrentWeek'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Group, Tooltip } from '@mantine/core'
import { getCurrentWeek, triggerLineupSwap } from '../api/client'
import { queryClient } from '../api/queryClient'
import { lineupRosterQuery } from '../api/weekReads'
import { useToast } from '../hooks/useToast'
import { RosterQuickActions } from './RosterQuickActions'
import { InjuryBadge } from './InjuryBadge'
import { LineupSuggestionPanel, LineupSuggestionPanelSkeleton } from './LineupSuggestionPanel'
import { PlayerCard } from './PlayerCard'
import { RumorBadge } from './RumorBadge'
import { PlayerRowSkeleton, SkeletonRegion } from './skeletons'
import type { DraftConfig, LineupPlayerLine } from '../api/types'

interface Props {
  config: DraftConfig
  week?: number | string
}

interface PendingSwap {
  id: string
  dropPlayer: LineupPlayerLine
  addPlayer: LineupPlayerLine
  slot: string
}

function DraggablePlayerCard({ line }: { line: LineupPlayerLine }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: line.player_id,
    data: { line },
  })
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
      }
    : undefined

  return (
    <PlayerCard
      variant="card"
      innerRef={setNodeRef}
      style={style}
      dragHandleProps={{ ...listeners, ...attributes }}
      player={{
        id: line.player_id,
        name: line.name,
        position: line.position,
        team: line.pro_team,
        headshotUrl: line.headshot_url,
      }}
      badges={
        <>
          <InjuryBadge status={line.injury_status} />
          <RumorBadge
            sentiment={line.rumor_sentiment}
            confidence={line.rumor_confidence}
            suggestedAction={line.rumor_suggested_action}
          />
        </>
      }
      stats={line.net_vorp !== null ? `VORP ${line.net_vorp.toFixed(1)}` : null}
    />
  )
}

function StarterSlot({
  line,
  bench,
  onApplyHint,
}: {
  line: LineupPlayerLine
  bench: LineupPlayerLine[]
  onApplyHint: (starter: LineupPlayerLine, benchPlayer: LineupPlayerLine) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: line.player_id, data: { line } })
  const hintedBenchPlayer = line.suggested_swap
    ? bench.find((p) => p.player_id === line.suggested_swap!.add_player_id)
    : undefined

  return (
    <div ref={setNodeRef} className={`lineup-slot ${isOver ? 'lineup-slot-over' : ''}`}>
      <span className="lineup-slot-label">{line.slot}</span>
      <DraggablePlayerCard line={line} />
      {line.deficit_flag && (
        <Tooltip label="This position is a structural deficit on your roster">
          <Badge color="yellow" size="xs">thin</Badge>
        </Tooltip>
      )}
      {hintedBenchPlayer && (
        <Tooltip label={`Optimizer suggests starting ${hintedBenchPlayer.name} instead`}>
          <Button size="xs" variant="light" onClick={() => onApplyHint(line, hintedBenchPlayer)}>
            Apply hint
          </Button>
        </Tooltip>
      )}
    </div>
  )
}

function LineupIntro() {
  return (
    <p className="muted">
      This submits a real lineup change to ESPN via the browser worker — it isn't a dry
      run. Drag a bench player onto a starting slot to stage a swap, review the list, then
      submit them together.
    </p>
  )
}

// Mirrors the editor's columns: a standard ESPN lineup has 9 starting slots and 6-7 bench spots.
function LineupEditorSkeleton({ week }: { week: number | string }) {
  return (
    <section className="lineup-editor">
      <Group justify="space-between" mb="md">
        <h2>Set your lineup</h2>
        <RosterQuickActions page="lineup" week={week} />
      </Group>
      <LineupIntro />
      <SkeletonRegion label="Loading your roster">
        <LineupSuggestionPanelSkeleton />
        <div className="lineup-editor-columns">
          <div className="lineup-editor-starters">
            <h3>Starters</h3>
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="lineup-slot">
                <span className="lineup-slot-label" />
                <PlayerRowSkeleton />
              </div>
            ))}
          </div>
          <div className="lineup-editor-bench">
            <h3>Bench</h3>
            {Array.from({ length: 6 }, (_, i) => <PlayerRowSkeleton key={i} />)}
          </div>
        </div>
      </SkeletonRegion>
    </section>
  )
}

export function LineupEditor({ config, week = '' }: Props) {
  const currentWeek = useCurrentWeek()
  const canSubmit = Number(week) === currentWeek
  const submissionAttempt = useRef<{ signature: string; key: string } | null>(null)
  const rosterOptions = lineupRosterQuery(config, week)
  const rosterQuery = useQuery(rosterOptions, queryClient)
  const roster = rosterQuery.data ?? null
  // Also true during background refreshes of a cached roster, so submits wait for them.
  const loading = rosterQuery.isFetching
  const error = rosterQuery.error ? String(rosterQuery.error) : null
  // Only identifiers survive navigation; player details come from the fresh roster.
  const draftKey = `fantasy.lineup-draft:${config.league_id}:${config.team_id}:${config.season}:${week}`
  const [pendingSwaps, setPendingSwaps] = useState<PendingSwap[]>([])
  const [draftNotice, setDraftNotice] = useState(false)

  function saveSwaps(swaps: PendingSwap[]) {
    setPendingSwaps(swaps)
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify(swaps.map((swap) => ({
        id: swap.id, dropId: swap.dropPlayer.player_id, addId: swap.addPlayer.player_id, slot: swap.slot,
      }))))
    } catch { /* The editor still works when session storage is unavailable. */ }
  }
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const { toast, showToast } = useToast()
  const submitMutation = useMutation({
    mutationFn: async () => {
      const live = await getCurrentWeek(config.season)
      if (!canSubmit || live.week !== Number(week)) {
        throw new Error('Lineup changes can only be submitted for the current week. Return to the current week and review your swaps.')
      }
      const signature = JSON.stringify([draftKey, pendingSwaps.map(s => [s.dropPlayer.espn_id, s.addPlayer.espn_id, s.slot])])
      if (submissionAttempt.current?.signature !== signature) submissionAttempt.current = {signature, key: crypto.randomUUID()}
      return triggerLineupSwap(
        config.team_id,
        pendingSwaps.map((swap) => ({
          drop_player_id: swap.dropPlayer.espn_id,
          add_player_id: swap.addPlayer.espn_id,
          slot: swap.slot,
        })),
        submissionAttempt.current.key,
      )
    },
  }, queryClient)

  // Staged swaps live in session storage; rebuild them only against a settled roster (not
  // another week's placeholder or a cached copy still being re-checked), because pruning
  // writes back to storage and would otherwise drop swaps that are still valid.
  const rosterSettled = !rosterQuery.isPlaceholderData && !rosterQuery.isFetching
  useEffect(() => {
    setPendingSwaps([])
    const fresh = rosterQuery.data
    if (!fresh || !rosterSettled) return
    try {
      const saved: unknown = JSON.parse(window.sessionStorage.getItem(draftKey) ?? '[]')
      if (!Array.isArray(saved)) return
      const restored: PendingSwap[] = []
      for (const item of saved) {
        if (!item || typeof item.id !== 'string') continue
        const dropPlayer = fresh.starters.find((p) => p.player_id === item.dropId && p.slot === item.slot)
        const addPlayer = fresh.bench.find((p) => p.player_id === item.addId)
        if (dropPlayer?.espn_id && addPlayer?.espn_id) {
          restored.push({ id: item.id, slot: item.slot, dropPlayer, addPlayer })
        }
      }
      setDraftNotice(restored.length !== saved.length)
      saveSwaps(restored)
    } catch { /* Ignore unavailable or corrupt draft storage. */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterQuery.data, rosterSettled, draftKey])

  function stageSwap(dropPlayer: LineupPlayerLine, addPlayer: LineupPlayerLine, slot: string) {
    if (!dropPlayer.espn_id || !addPlayer.espn_id) {
      showToast('error', 'One of these players has no ESPN id in our crosswalk — make this change in ESPN directly.')
      return
    }
    saveSwaps([
      ...pendingSwaps.filter((swap) =>
        swap.dropPlayer.player_id !== dropPlayer.player_id && swap.addPlayer.player_id !== addPlayer.player_id),
      { id: crypto.randomUUID(), dropPlayer, addPlayer, slot },
    ])
  }

  function handleDragEnd(event: DragEndEvent) {
    const draggedLine = event.active.data.current?.line as LineupPlayerLine | undefined
    const targetLine = event.over?.data.current?.line as LineupPlayerLine | undefined
    if (!draggedLine || !targetLine || !roster) return
    if (draggedLine.player_id === targetLine.player_id) return
    // Only a bench player dropped onto a starter slot is a supported swap - dragging a
    // starter anywhere (including onto another starter) is a no-op in v1.
    const isDraggedBench = roster.bench.some((p) => p.player_id === draggedLine.player_id)
    const isTargetStarter = roster.starters.some((p) => p.player_id === targetLine.player_id)
    if (!isDraggedBench || !isTargetStarter) return
    stageSwap(targetLine, draggedLine, targetLine.slot)
  }

  function removeSwap(id: string) {
    saveSwaps(pendingSwaps.filter((swap) => swap.id !== id))
  }

  async function submitSwaps() {
    try {
      const accepted = await submitMutation.mutateAsync()
      submissionAttempt.current = null
      setTrackingId(accepted.tracking_id)
      showToast(
        'success',
        `Queued ${pendingSwaps.length} lineup swap(s). Waiting for verification.`,
      )
      saveSwaps([])
      void queryClient.invalidateQueries({ queryKey: rosterOptions.queryKey })
    } catch (err) {
      showToast('error', `Failed to submit lineup swaps: ${String(err)}`)
    }
  }

  if (rosterQuery.isLoading) return <LineupEditorSkeleton week={week} />
  // A failed background refresh keeps showing the cached roster.
  if (!roster) return error ? <Alert color="red">{error}</Alert> : null

  return (
    <section className="lineup-editor" aria-busy={loading || undefined}>
      <Group justify="space-between" mb="md">
        <h2>Set your lineup</h2>
        <RosterQuickActions page="lineup" week={week} />
      </Group>
      {!canSubmit && <Alert color="yellow" mb="md">This week is for planning only. Return to the current week to submit lineup changes.</Alert>}
      {draftNotice && (
        <Alert color="yellow" mb="md">
          Some staged swaps were removed because your roster changed. Review your lineup before
          submitting.
        </Alert>
      )}
      <LineupIntro />
      <LineupSuggestionPanel
        roster={roster}
        onApply={(starter, benchPlayer) => stageSwap(starter, benchPlayer, starter.slot)}
      />
      <DndContext onDragEnd={handleDragEnd}>
        <div className="lineup-editor-columns">
          <div className="lineup-editor-starters">
            <h3>Starters</h3>
            {roster.starters.map((line) => (
              <StarterSlot
                key={line.player_id}
                line={line}
                bench={roster.bench}
                onApplyHint={(starter, benchPlayer) => stageSwap(starter, benchPlayer, starter.slot)}
              />
            ))}
          </div>
          <div className="lineup-editor-bench">
            <h3>Bench</h3>
            {roster.bench.map((line) => <DraggablePlayerCard key={line.player_id} line={line} />)}
          </div>
        </div>
      </DndContext>

      {pendingSwaps.length > 0 && (
        <ul className="lineup-swap-pending-list">
          {pendingSwaps.map((swap) => (
            <li key={swap.id}>
              <span>{swap.dropPlayer.name} → bench, {swap.addPlayer.name} → {swap.slot}</span>
              <Button variant="subtle" size="xs" onClick={() => removeSwap(swap.id)}>✕</Button>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={submitSwaps} loading={submitMutation.isPending} disabled={pendingSwaps.length === 0 || !canSubmit || loading}>
        Submit lineup changes
      </Button>

      {trackingId && (
        <Button component={Link} to={`/activity/actions/${trackingId}`} variant="subtle">
          Track lineup changes
        </Button>
      )}
      {toast && <p className={`status-message toast toast-${toast.tone}`}>{toast.message}</p>}
    </section>
  )
}
