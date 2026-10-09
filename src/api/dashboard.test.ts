import { beforeEach, expect, it, vi } from 'vitest'
import { getActions, type ActivityAction } from './dashboard'
import { request } from './client'

vi.mock('./client', () => ({ request: vi.fn() }))
const waiver: ActivityAction = {
  id: 'claim/1', title: 'Claim', kind: 'waiver_actions', execution: 'queued',
  outcome: 'unknown', created_at: '', updated_at: '', attempts: 0, unread: true,
  payload: {}, evidence: {},
}
beforeEach(() => vi.resetAllMocks())

it('loads waiver dependency timelines while preserving list unread state and other actions', async () => {
  const lineup = { ...waiver, id: 'ir', kind: 'lineup_updates' }
  const events = [{ id: 1, stage: 'held_for_dependency', detail: { depends_on: 'ir' }, created_at: '' }]
  vi.mocked(request).mockResolvedValueOnce({ items: [waiver, lineup] })
    .mockResolvedValueOnce({ ...waiver, unread: false, events })
  const page = await getActions(50, true)
  expect(request).toHaveBeenNthCalledWith(1, '/v1/activity/actions?offset=50&attention=true')
  expect(request).toHaveBeenNthCalledWith(2, '/v1/activity/actions/claim%2F1')
  expect(page.items).toEqual([{ ...waiver, events }, lineup])
})

it('keeps the indicator lightweight', async () => {
  vi.mocked(request).mockResolvedValue({ items: [waiver] })
  await getActions(0, false, false)
  expect(request).toHaveBeenCalledTimes(1)
})

it('reports detail read failures rather than displaying an unresolved held claim as needing attention', async () => {
  vi.mocked(request).mockResolvedValueOnce({ items: [waiver] }).mockRejectedValueOnce(new Error('offline'))
  await expect(getActions(0, true)).rejects.toThrow('offline')
})
