import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryClient } from '../api/queryClient'
import { GlobalProgress, PROGRESS_DELAY_MS } from './GlobalProgress'

const never = () => new Promise<never>(() => {})

function SlowQuery() {
  useQuery({ queryKey: ['slow'], queryFn: never })
  return null
}

function CachedQuery() {
  useQuery({ queryKey: ['cached'], queryFn: never, staleTime: Infinity })
  return null
}

function SlowMutation() {
  const { mutate } = useMutation({ mutationFn: never })
  useEffect(() => mutate(), [mutate])
  return null
}

function renderWith(child: React.ReactNode) {
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <GlobalProgress />
        {child}
      </QueryClientProvider>
    </MantineProvider>,
  )
}

const bar = () => screen.getByTestId('global-progress')
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
// React Query notifies observers on a 0 ms timer; flush it so the debounce clock starts.
const flushQueryNotifications = () => advance(0)

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('stays hidden for the debounce window, then shows for a slow fetch', () => {
  renderWith(<SlowQuery />)
  flushQueryNotifications()
  advance(PROGRESS_DELAY_MS - 10)
  expect(bar().hasAttribute('data-mounted')).toBe(false)
  advance(20)
  expect(bar().hasAttribute('data-mounted')).toBe(true)
})

it('never shows for a cache hit', () => {
  queryClient.setQueryData(['cached'], { ok: true })
  renderWith(<CachedQuery />)
  advance(PROGRESS_DELAY_MS * 5)
  expect(bar().hasAttribute('data-mounted')).toBe(false)
})

it('shows for an in-flight mutation', () => {
  renderWith(<SlowMutation />)
  flushQueryNotifications()
  advance(PROGRESS_DELAY_MS + 10)
  expect(bar().hasAttribute('data-mounted')).toBe(true)
})
