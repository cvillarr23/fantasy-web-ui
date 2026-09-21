import { useEffect, useState } from 'react'
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { Alert, Badge, Button, Text, Tooltip } from '@mantine/core'
import { getLineupRoster, triggerLineupSwap } from '../api/client'
import { useToast } from '../hooks/useToast'
import { InjuryBadge } from './InjuryBadge'
import { LineupSuggestionPanel } from './LineupSuggestionPanel'
import { PlayerAvatar } from './PlayerAvatar'
import type { DraftConfig, LineupPlayerLine, LineupRosterResponse } from '../api/types'

interface Props {
  config: DraftConfig
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
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="lineup-player-card"
      role="button"
      tabIndex={0}
    >
      <PlayerAvatar name={line.name} headshotUrl={line.headshot_url} />
      <div className="lineup-player-card-info">
        <span className="lineup-player-card-name">
          {line.name}
          <InjuryBadge status={line.injury_status} />
        </span>
        <span className="lineup-player-card-meta">
          {line.position} · {line.pro_team}
          {line.net_vorp !== null && <> · VORP {line.net_vorp.toFixed(1)}</>}
        </span>
      </div>
    </div>
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

export function LineupEditor({ config }: Props) {
  const [roster, setRoster] = useState<LineupRosterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingSwaps, setPendingSwaps] = useState<PendingSwap[]>([])
  const [busy, setBusy] = useState(false)
  const { toast, showToast } = useToast()

  function loadRoster() {
    setLoading(true)
    setError(null)
    getLineupRoster(config.season)
      .then(setRoster)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRoster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.season])

  function stageSwap(dropPlayer: LineupPlayerLine, addPlayer: LineupPlayerLine, slot: string) {
    if (!dropPlayer.espn_id || !addPlayer.espn_id) {
      showToast('error', 'One of these players has no ESPN id in our crosswalk — make this change in ESPN directly.')
      return
    }
    setPendingSwaps((prev) => [...prev, { id: crypto.randomUUID(), dropPlayer, addPlayer, slot }])
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
    setPendingSwaps((prev) => prev.filter((swap) => swap.id !== id))
  }

  async function submitSwaps() {
    setBusy(true)
    try {
      await triggerLineupSwap(
        config.team_id,
        pendingSwaps.map((swap) => ({
          drop_player_id: swap.dropPlayer.espn_id,
          add_player_id: swap.addPlayer.espn_id,
          slot: swap.slot,
        })),
      )
      showToast('success', `Submitted ${pendingSwaps.length} lineup swap(s).`)
      setPendingSwaps([])
      loadRoster()
    } catch (err) {
      showToast('error', `Failed to submit lineup swaps: ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Text c="dimmed">Loading your roster…</Text>
  if (error) return <Alert color="red">{error}</Alert>
  if (!roster) return null

  return (
    <section className="lineup-editor">
      <h2>Set your lineup</h2>
      <p className="muted">
        This submits a real lineup change to ESPN via the browser worker — it isn't a dry
        run. Drag a bench player onto a starting slot to stage a swap, review the list, then
        submit them together.
      </p>
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

      <Button onClick={submitSwaps} loading={busy} disabled={pendingSwaps.length === 0}>
        Submit lineup changes
      </Button>

      {toast && <p className={`status-message toast toast-${toast.tone}`}>{toast.message}</p>}
    </section>
  )
}
