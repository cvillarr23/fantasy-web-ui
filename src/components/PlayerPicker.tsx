import { useEffect, useRef, useState } from 'react'
import { Button, TextInput } from '@mantine/core'
import { searchPlayers } from '../api/client'
import type { PlayerSearchResult } from '../api/types'

interface Props {
  onSelect: (player: PlayerSearchResult) => void
  selected: PlayerSearchResult | null
  onClear: () => void
}

const DEBOUNCE_MS = 250

function PlayerStats({ player }: { player: PlayerSearchResult }) {
  return (
    <span className="player-picker-stats">
      {player.vorp_score !== null && <span className="candidate-score">VORP {player.vorp_score.toFixed(1)}</span>}
      {player.projected_points !== null && <span className="candidate-score">Proj {player.projected_points.toFixed(1)}</span>}
      {player.injury_status && <span className="injury-tag">{player.injury_status}</span>}
    </span>
  )
}

export function PlayerPicker({ onSelect, selected, onClear }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current
      searchPlayers(query.trim())
        .then((found) => {
          if (requestId === requestIdRef.current) setResults(found)
        })
        .catch(() => {
          if (requestId === requestIdRef.current) setResults([])
        })
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  if (selected) {
    return (
      <div className="player-picker-selected">
        <span className="candidate-name">{selected.name}</span>
        <span className="candidate-position">{selected.position}</span>
        <span className="pick-team">{selected.team}</span>
        <PlayerStats player={selected} />
        <Button variant="subtle" size="xs" onClick={onClear}>Change</Button>
      </div>
    )
  }

  return (
    <div className="player-picker">
      <TextInput
        placeholder="Search player by name…"
        value={query}
        onChange={(e) => {
          setQuery(e.currentTarget.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <ul className="player-picker-results">
          {results.map((p) => (
            <li
              key={p.player_id}
              onMouseDown={() => {
                onSelect(p)
                setQuery('')
                setResults([])
                setOpen(false)
              }}
            >
              <span className="candidate-name">{p.name}</span>
              <span className="candidate-position">{p.position}</span>
              <span className="pick-team">{p.team}</span>
              <PlayerStats player={p} />
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="player-picker-empty">No matches.</div>
      )}
    </div>
  )
}
