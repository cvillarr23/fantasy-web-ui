import { afterEach, expect, it, vi } from 'vitest'
import { request } from './client'
import { queryClient, setQueryScope } from './queryClient'
afterEach(() => {
  queryClient.clear()
  vi.unstubAllGlobals()
})
it('deduplicates shared reads and isolates league caches', async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify({ name: 'Team' }), { status: 200 }))
  vi.stubGlobal('fetch', fetcher)
  setQueryScope('league-a')
  await Promise.all([request('/v1/league/teams'), request('/v1/league/teams')])
  await request('/v1/league/teams')
  expect(fetcher).toHaveBeenCalledTimes(1)
  setQueryScope('league-b')
  await request('/v1/league/teams')
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('never caches or retries a live mutation', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('timeout'))
  vi.stubGlobal('fetch', fetcher)
  await expect(request('/v1/trigger/waiver', { method: 'POST', body: '{}' })).rejects.toThrow(
    'timeout',
  )
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('a failed read can be retried successfully', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
    .mockResolvedValueOnce(new Response('{"week":5}', { status: 200 }))
  vi.stubGlobal('fetch', fetcher)
  await expect(request('/v1/league/current-week')).rejects.toThrow('unavailable')
  await expect(request('/v1/league/current-week')).resolves.toEqual({ week: 5 })
})
