import { useCurrentWeek } from '../hooks/useCurrentWeek'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Group, Modal, Stack, Text, Tooltip } from '@mantine/core'
import { ApiError, getCurrentWeek, triggerLineupSwap } from '../api/client'
import { queryClient } from '../api/queryClient'
import { lineupRosterQuery } from '../api/weekReads'
import { useToast } from '../hooks/useToast'
import { RosterQuickActions } from './RosterQuickActions'
import { irMoveIdempotencyKey, irMoveInstruction } from './irMoves'
import { LineupSuggestionPanel, LineupSuggestionPanelSkeleton } from './LineupSuggestionPanel'
import { PlayerCard } from './player/PlayerCard'
import { PlayerRowSkeleton, SkeletonRegion } from './skeletons'
import type { DraftConfig, LineupPlayerLine } from '../api/types'
import { ToastLine } from './ui/ToastLine'
import { PlayerStatusBadges } from './player/PlayerStatusBadges'

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

interface QueuedIrMove {
  trackingId: string
  duplicate: boolean
}

interface IrAction {
  label: string
  disabledReason: string | null
  queued: QueuedIrMove | null
  onClick: () => void
}

/** A failure before anything was sent, so its message can be shown as-is. */
class IrMoveNotSentError extends Error {}

// Only a 4xx proves the gateway refused the move. A timeout, a 5xx or a network failure may
// have happened after the message was queued, so the wording stays uncertain and the retry
// relies on the move's stable idempotency key.
function irErrorMessage(err: unknown): string {
  if (err instanceof IrMoveNotSentError) return err.message
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
    return `The lineup service rejected this IR move: ${err.message}. Nothing was queued.`
  }
  return "We couldn't confirm the IR move was queued. Retrying is safe; it reuses the same request id."
}

function IrMoveAction({ action }: { action: IrAction }) {
  if (action.queued) {
    return (
      <Group gap="xs" mb="xs">
        <Badge color="gray" size="xs">Queued</Badge>
        <Text size="xs" c="dimmed">
          {action.queued.duplicate ? 'Already queued for ESPN, not confirmed yet.' : 'Queued for ESPN, not confirmed yet.'}
        </Text>
        <Button component={Link} to={`/activity/actions/${action.queued.trackingId}`} variant="subtle" size="xs">
          Track IR move
        </Button>
      </Group>
    )
  }
  const button = (
    <Button size="xs" variant="light" color="yellow" mb="xs" disabled={action.disabledReason !== null} onClick={action.onClick}>
      {action.label}
    </Button>
  )
  // Disabled buttons swallow pointer events, so the tooltip needs a wrapper to anchor to.
  return action.disabledReason
    ? <Tooltip label={action.disabledReason}><span>{button}</span></Tooltip>
    : button
}

function DraggablePlayerCard({ line, irAction }: { line: LineupPlayerLine; irAction?: IrAction | null }) {
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
    <div className="lineup-player-details">
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
          <PlayerStatusBadges
            player={line}
            extra={line.ir_suggestion && (
              <Badge color="yellow" size="xs">
                {line.ir_suggestion.action === 'move_to_ir' ? 'Move to IR' : 'Activate from IR'}
              </Badge>
            )}
          />
        }
        stats={line.net_vorp !== null ? `VORP ${line.net_vorp.toFixed(1)}` : null}
      />
      {line.ir_suggestion && (
        <Text size="xs" c="dimmed" mt={4} mb="xs">{line.ir_suggestion.reason}</Text>
      )}
      {irAction && <IrMoveAction action={irAction} />}
    </div>
  )
}

function StarterSlot({
  line,
  bench,
  irAction,
  onApplyHint,
}: {
  line: LineupPlayerLine
  bench: LineupPlayerLine[]
  irAction: IrAction | null
  onApplyHint: (starter: LineupPlayerLine, benchPlayer: LineupPlayerLine) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: line.player_id, data: { line } })
  const hintedBenchPlayer = line.suggested_swap
    ? bench.find((p) => p.player_id === line.suggested_swap!.add_player_id)
    : undefined

  return (
    <div ref={setNodeRef} className={`lineup-slot ${isOver ? 'lineup-slot-over' : ''}`}>
      <span className="lineup-slot-label">{line.slot}</span>
      <DraggablePlayerCard line={line} irAction={irAction} />
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

  const [irTarget, setIrTarget] = useState<LineupPlayerLine | null>(null)
  const [irError, setIrError] = useState<string | null>(null)
  const [queuedIr, setQueuedIr] = useState<Record<string, QueuedIrMove>>({})
  // Mutation state reaches the render a tick late, so a fast second click would otherwise
  // start a second send before the Confirm button shows it is busy.
  const irInFlight = useRef(false)
  const irMutation = useMutation({
    mutationFn: async (line: LineupPlayerLine) => {
      const instruction = irMoveInstruction(line)
      if (!instruction) throw new IrMoveNotSentError('This player has no ESPN id in our crosswalk. Make this move in ESPN.')
      const live = await getCurrentWeek(config.season)
      if (!canSubmit || live.week !== Number(week)) {
        throw new IrMoveNotSentError('IR moves can only be submitted for the current week. Return to the current week and review your roster.')
      }
      const key = irMoveIdempotencyKey(config, week, instruction.player_id, instruction.kind)
      return { key, accepted: await triggerLineupSwap(config.team_id, [instruction], key) }
    },
  }, queryClient)

  function openIrMove(line: LineupPlayerLine) {
    setIrError(null)
    setIrTarget(line)
  }

  async function confirmIrMove() {
    if (!irTarget || irInFlight.current) return
    irInFlight.current = true
    setIrError(null)
    try {
      const { key, accepted } = await irMutation.mutateAsync(irTarget)
      setQueuedIr((prev) => ({
        ...prev,
        [key]: { trackingId: accepted.tracking_id, duplicate: accepted.status === 'duplicate' },
      }))
      setIrTarget(null)
      // A 202 only means the lineup queue took the message. The worker and ESPN decide later,
      // out of this page's sight, so nothing here may say the player moved.
      showToast('success', `Queued IR move for ${irTarget.name}. Waiting for ESPN; check your roster to confirm.`)
      void queryClient.invalidateQueries({ queryKey: rosterOptions.queryKey })
    } catch (err) {
      setIrError(irErrorMessage(err))
    } finally {
      irInFlight.current = false
    }
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

  const blocked = Boolean(roster.ir_blocking_transactions)
  const pendingActivations = blocked
    ? [...roster.starters, ...roster.bench].filter((line) => line.ir_suggestion?.action === 'activate_from_ir')
    : []

  function irActionFor(line: LineupPlayerLine): IrAction | null {
    const suggestion = line.ir_suggestion
    if (!suggestion) return null
    const moving = suggestion.action === 'move_to_ir'
    const instruction = irMoveInstruction(line)
    const queued = instruction
      ? queuedIr[irMoveIdempotencyKey(config, week, instruction.player_id, instruction.kind)] ?? null
      : null
    let disabledReason: string | null = null
    if (!canSubmit) disabledReason = 'Return to the current week to submit IR moves.'
    else if (!line.espn_id) disabledReason = 'No ESPN id in our crosswalk. Make this move in ESPN.'
    else if (moving && blocked) disabledReason = 'Activate your IR player first. ESPN rejects other moves until then.'
    else if (loading) disabledReason = 'Refreshing your roster.'
    else if (irMutation.isPending) disabledReason = 'Another IR move is being sent.'
    return {
      label: moving ? `Move ${line.name} to IR` : `Activate ${line.name} from IR`,
      disabledReason,
      queued,
      onClick: () => openIrMove(line),
    }
  }

  // While blocked, activation lives in the warning at the top of the page instead of on the
  // card, so the one move ESPN will accept is the first thing on the page and isn't doubled.
  function cardIrActionFor(line: LineupPlayerLine): IrAction | null {
    return pendingActivations.includes(line) ? null : irActionFor(line)
  }

  const irMoving = irTarget?.ir_suggestion?.action === 'move_to_ir'

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
      {blocked && (
        <Alert color="yellow" title="IR player needs activation" mb="md">
          {pendingActivations.length > 0 ? (
            <Stack gap="xs">
              <Text size="sm">
                ESPN blocks lineup and waiver transactions while an active player is in IR.
                Activate them first.
              </Text>
              {pendingActivations.map((line) => {
                const action = irActionFor(line)
                return action && <IrMoveAction key={line.player_id} action={action} />
              })}
            </Stack>
          ) : (
            <>
              ESPN blocks lineup and waiver transactions while an active player is in IR.
              Activate the player directly in ESPN before submitting roster changes.
            </>
          )}
        </Alert>
      )}
      <LineupIntro />
      {[...roster.starters, ...roster.bench].some((line) => line.ir_suggestion) && (
        <Text size="sm" c="dimmed" mb="md">
          IR moves are sent to ESPN after you confirm. ESPN can still refuse one, so check your
          roster after it's queued.
        </Text>
      )}
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
                irAction={cardIrActionFor(line)}
                onApplyHint={(starter, benchPlayer) => stageSwap(starter, benchPlayer, starter.slot)}
              />
            ))}
          </div>
          <div className="lineup-editor-bench">
            <h3>Bench</h3>
            {roster.bench.map((line) => (
              <DraggablePlayerCard key={line.player_id} line={line} irAction={cardIrActionFor(line)} />
            ))}
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
      <ToastLine toast={toast} />

      <Modal
        opened={irTarget !== null}
        onClose={() => !irMutation.isPending && setIrTarget(null)}
        title={irMoving ? 'Confirm live ESPN IR move' : 'Confirm live ESPN IR activation'}
      >
        {irTarget && (
          <Stack>
            <Text>
              {irMoving ? (
                <>Move <strong>{irTarget.name}</strong> ({irTarget.position}, {irTarget.pro_team}) from {irTarget.slot} to IR on ESPN.</>
              ) : (
                <>Move <strong>{irTarget.name}</strong> from IR to your bench on ESPN.</>
              )}{' '}
              This is a real change to your ESPN roster, not a dry run.
            </Text>
            {irTarget.ir_suggestion && <Text size="sm" c="dimmed">{irTarget.ir_suggestion.reason}</Text>}
            {/* The worker moves only this one player, so it neither fills the slot a starter
                leaves nor makes bench room for a returning player. */}
            <Text size="sm">
              {irMoving
                ? irTarget.slot === 'BE' || irTarget.slot === 'BENCH'
                  ? 'This frees a bench spot.'
                  : `This leaves the ${irTarget.slot} slot empty until you start someone there.`
                : 'ESPN needs an open bench spot for this, or it refuses the move.'}
            </Text>
            <Text size="sm">
              ESPN can still refuse it. For example, it only allows IR for players listed OUT or
              on injured reserve, and only with a free IR slot. This page can't see that answer,
              so check your roster and Activity after it's queued.
            </Text>
            {irError && <Alert color="red">{irError}</Alert>}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setIrTarget(null)} disabled={irMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={() => void confirmIrMove()} loading={irMutation.isPending}>
                {irMoving ? 'Confirm IR move' : 'Confirm activation'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </section>
  )
}
