import { afterEach, expect, it, vi } from 'vitest'
import { request } from './client'
import { cacheKey, queryClient, setQueryScope } from './queryClient'
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
  const read = () =>
    queryClient.fetchQuery({
      queryKey: cacheKey('/v1/league/teams'),
      staleTime: 30_000,
      queryFn: () => request('/v1/league/teams'),
    })
  await Promise.all([read(), read()])
  await read()
  expect(fetcher).toHaveBeenCalledTimes(1)
  setQueryScope('league-b')
  await read()
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

it('polling and refresh reads bypass previously fetched responses', async () => {
  const fetcher = vi.fn().mockImplementation(async () => new Response('{}'))
  vi.stubGlobal('fetch', fetcher)
  for (const path of ['/v1/draft/practice/sync-job/status', '/v1/league/player-leaders']) {
    await request(path)
    await request(path)
  }
  expect(fetcher).toHaveBeenCalledTimes(4)
})
it('preserves caller cancellation', async () => {
  const controller = new AbortController()
  let signal: AbortSignal | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_path, init) => {
      signal = init.signal
      return new Response('{}')
    }),
  )
  await request('/v1/league/teams', { signal: controller.signal })
  controller.abort()
  expect(signal?.aborted).toBe(true)
})
