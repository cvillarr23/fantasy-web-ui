import type { LineupPlayerLine, LineupRosterResponse } from '../api/types'

export interface LineupSections {
  bench: LineupPlayerLine[]
  ir: LineupPlayerLine[]
  /** null when the league's slot counts aren't synced, so no capacity can be shown. */
  benchCapacity: number | null
  irCapacity: number | null
  openBench: number
  openIr: number
}

// Core returns IR players inside `bench` with slot "IR"; only the slot tells them apart.
export function lineupSections(roster: LineupRosterResponse): LineupSections {
  const bench = roster.bench.filter((line) => line.slot !== 'IR')
  const ir = roster.bench.filter((line) => line.slot === 'IR')
  const counts = roster.lineup_slot_counts ?? null
  const benchCapacity = counts ? counts.BE ?? null : null
  // Synced settings without an IR entry mean the league has no IR slots.
  const irCapacity = counts ? counts.IR ?? 0 : null
  return {
    bench,
    ir,
    benchCapacity,
    irCapacity,
    openBench: Math.max(0, (benchCapacity ?? 0) - bench.length),
    openIr: Math.max(0, (irCapacity ?? 0) - ir.length),
  }
}
