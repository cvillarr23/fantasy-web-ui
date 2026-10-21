import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useTradeContextControls } from './useTradeContextControls'
import { candidate, finderConfig } from '../components/tradeFinder/fixtures'

it('prefills both sides and counterparty, and issues a fresh score trigger each time', () => {
  const hook = renderHook(({ config }) => useTradeContextControls(config), { initialProps: { config: finderConfig } })
  act(() => hook.result.current.prefillTrade!({ candidate: candidate(), week: 5, horizon: 3 }))
  const first = hook.result.current.builderDraft!
  expect(hook.result.current.counterpartyTeamId).toBe('8')
  expect(hook.result.current.horizon).toBe(3)
  expect(first.incoming[0]).toMatchObject({ espn_id: '200', player_id: 'p200', name: 'Received Wideout' })
  expect(first.outgoing[0]).toMatchObject({ espn_id: '100', player_id: 'p100' })
  expect(first.week).toBe(5)
  act(() => hook.result.current.prefillTrade!({ candidate: candidate(), week: 5, horizon: 3 }))
  expect(hook.result.current.builderDraft!.revision).not.toBe(first.revision)
  hook.rerender({ config: { ...finderConfig, team_id: '9' } })
  expect(hook.result.current.builderDraft).toBeNull()
  expect(hook.result.current.counterpartyTeamId).toBe('')
})
it('retains ESPN identity when the internal player mapping is missing', () => {
  const c = candidate(); c.receive[0].player_id = null
  const hook = renderHook(() => useTradeContextControls(finderConfig))
  act(() => hook.result.current.prefillTrade!({ candidate: c, week: 5, horizon: 4 }))
  expect(hook.result.current.builderDraft!.incoming[0]).toMatchObject({ player_id: '', espn_id: '200' })
})
