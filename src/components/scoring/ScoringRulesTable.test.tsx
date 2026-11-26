import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { renderForTest } from '../jobs/renderForTest'
import { scoringRules } from './fixtures'
import { ScoringRulesTable } from './ScoringRulesTable'

afterEach(cleanup)

const rowFor = (label: string | RegExp) => screen.getByRole('row', { name: label })

describe('ScoringRulesTable', () => {
  it('shows each rule in plain English under its category', () => {
    renderForTest(<ScoringRulesTable rules={scoringRules.rules} />)
    const table = screen.getByRole('table', { name: "Your league's scoring rules" })
    expect(within(rowFor(/Rushing yards/)).getByText('1 pt per 10 rushing yds')).toBeTruthy()
    const groups = within(table).getAllByRole('rowheader').map((cell) => cell.textContent)
    expect(groups).toEqual(['Passing', 'Rushing', 'Receiving', 'Turnovers', 'Defense', 'Returns'])
  })

  it('marks only the rules that cost points', () => {
    renderForTest(<ScoringRulesTable rules={scoringRules.rules} />)
    expect(screen.getByText('−2 pts per fumble lost').className).toContain('scoring-rule-negative')
    expect(screen.getByText('6 pts per rushing TD').className).not.toContain('scoring-rule-negative')
  })

  it('tags a position only where the category does not already say it', () => {
    const quarterback = { ...scoringRules.rules[3], points_per: 0.2, rule_label: '1 pt per 5 rushing yds', position: 'QB' }
    renderForTest(<ScoringRulesTable rules={[...scoringRules.rules, quarterback]} />)
    expect(screen.getByRole('row', { name: /Rushing yards \(QB\)/ })).toBeTruthy()
    expect(screen.queryByText(/Sacks \(D\/ST\)/)).toBeNull()
  })

  it('shows a rule core lists twice only once', () => {
    const sacks = scoringRules.rules.find((r) => r.stat_key === 'sacks')!
    renderForTest(<ScoringRulesTable rules={[sacks, { ...sacks }]} />)
    expect(screen.getAllByText('1 pt per sack')).toHaveLength(1)
  })
})
