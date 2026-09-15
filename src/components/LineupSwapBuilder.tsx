import { useState } from 'react'
import { Button, Select, Text } from '@mantine/core'
import { triggerLineupSwap } from '../api/client'
import { PlayerPicker } from './PlayerPicker'
import { useToast } from '../hooks/useToast'
import type { DraftConfig, PlayerSearchResult } from '../api/types'

interface Props {
  config: DraftConfig
}

interface PendingSwap {
  id: string
  dropPlayer: PlayerSearchResult
  addPlayer: PlayerSearchResult
  slot: string
}

// Display slots for the target-slot picker. Ordinal suffixes (RB1/RB2, WR1/WR2/WR3) are
// cosmetic - fantasy-browser-worker's lineup_bot.js strips the trailing digit before mapping
// to an ESPN lineupSlotId, so the exact number here doesn't have to match this league's real
// roster shape.
const SLOT_OPTIONS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX', 'D/ST', 'K']

export function LineupSwapBuilder({ config }: Props) {
  const [dropPlayer, setDropPlayer] = useState<PlayerSearchResult | null>(null)
  const [addPlayer, setAddPlayer] = useState<PlayerSearchResult | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [pendingSwaps, setPendingSwaps] = useState<PendingSwap[]>([])
  const [busy, setBusy] = useState(false)
  const { toast, showToast } = useToast()

  function addSwap() {
    if (!dropPlayer || !addPlayer || !slot) return
    if (dropPlayer.player_id === addPlayer.player_id) {
      showToast('error', 'Bench and start player must be different.')
      return
    }
    // Blocked here, not just at submit time: the worker addresses players by ESPN's id, so a
    // player with no crosswalk entry can never be part of a swap this UI submits.
    if (!dropPlayer.espn_id || !addPlayer.espn_id) {
      showToast('error', 'One of the selected players has no ESPN id in our crosswalk — make this change in ESPN directly.')
      return
    }
    setPendingSwaps((prev) => [
      ...prev,
      { id: crypto.randomUUID(), dropPlayer, addPlayer, slot },
    ])
    setDropPlayer(null)
    setAddPlayer(null)
    setSlot(null)
  }

  function removeSwap(id: string) {
    setPendingSwaps((prev) => prev.filter((swap) => swap.id !== id))
  }

  async function submitSwaps() {
    setBusy(true)
    try {
      await triggerLineupSwap(
        config.team_id,
        // The worker acts on ESPN's id space, not the internal Sleeper player_id - same rule
        // triggerDraftPick follows. addSwap() already refused any player missing espn_id, so
        // every pending swap is guaranteed to have one here.
        pendingSwaps.map((swap) => ({
          drop_player_id: swap.dropPlayer.espn_id as string,
          add_player_id: swap.addPlayer.espn_id as string,
          slot: swap.slot,
        })),
      )
      showToast('success', `Submitted ${pendingSwaps.length} lineup swap(s).`)
      setPendingSwaps([])
    } catch (err) {
      showToast('error', `Failed to submit lineup swaps: ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="lineup-swap-builder">
      <h2>Set your lineup</h2>
      <p className="muted">
        This submits a real lineup change to ESPN via the browser worker — it isn't a dry
        run. Add one or more swaps below, review the list, then submit them together.
      </p>

      <div className="lineup-swap-row">
        <div className="lineup-swap-field">
          <Text size="sm" fw={500}>Bench</Text>
          <PlayerPicker selected={dropPlayer} onSelect={setDropPlayer} onClear={() => setDropPlayer(null)} />
        </div>
        <div className="lineup-swap-field">
          <Text size="sm" fw={500}>Start</Text>
          <PlayerPicker selected={addPlayer} onSelect={setAddPlayer} onClear={() => setAddPlayer(null)} />
        </div>
        <div className="lineup-swap-field">
          <Select label="Slot" placeholder="Choose slot" data={SLOT_OPTIONS} value={slot} onChange={setSlot} />
        </div>
        <Button onClick={addSwap} disabled={!dropPlayer || !addPlayer || !slot}>Add swap</Button>
      </div>

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
