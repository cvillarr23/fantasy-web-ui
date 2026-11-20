import { describe, expect, it } from 'vitest'
import { vorpCell, vorpLabel, vorpSummary } from './vorpSummary'

const metric = (vorp_score: number | null) => ({ vorp_score, projected_points: vorp_score == null ? null : 10 })
const player = (overrides: Partial<Parameters<typeof vorpSummary>[0]>) => ({
  nfl_bye_week: 9, injury_status: 'ACTIVE', metrics: { '11': metric(2.5), '12': metric(1), '13': metric(-0.5) }, ...overrides,
})

describe('vorpSummary', () => {
  it('shows the viewed week when it has VORP', () => {
    const summary = vorpSummary(player({}), 11)
    expect(vorpLabel(summary)).toBe('2.5 VORP')
    expect(vorpCell(summary)).toBe('2.5')
  })

  it('explains a bye week and sums the later weeks that have VORP', () => {
    const summary = vorpSummary(player({ nfl_bye_week: 11, metrics: { '11': metric(null), '12': metric(-3), '13': metric(null), '14': metric(-5) } }), 11)
    expect(vorpLabel(summary)).toBe('On bye · -8.0 VORP next 2 wks')
    expect(vorpCell(summary)).toBe('Bye')
  })

  it('labels an injured-reserve player with no projection in any week', () => {
    const summary = vorpSummary(player({ injury_status: 'INJURY_RESERVE', metrics: { '11': metric(null), '12': metric(null) } }), 11)
    expect(vorpLabel(summary)).toBe('IR · no projection')
    expect(vorpCell(summary)).toBe('IR')
  })

  it('shows a ruled-out player returning later in the horizon', () => {
    const summary = vorpSummary(player({ injury_status: 'OUT', metrics: { '11': metric(null), '12': metric(4) } }), 11)
    expect(vorpLabel(summary)).toBe('Out · 4.0 VORP next 1 wk')
  })

  it('keeps an unexplained gap generic', () => {
    const summary = vorpSummary(player({ metrics: {} }), 11)
    expect(vorpLabel(summary)).toBe('No projection')
    expect(vorpCell(summary)).toBe('Unknown')
  })
})
