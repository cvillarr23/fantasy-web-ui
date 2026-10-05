import { useEffect, useMemo, useRef } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { createNprogress, NavigationProgress } from '@mantine/nprogress'

// Long enough that cache hits and instant reads never flash the bar, short enough that a slow
// ESPN-backed read or a submission visibly registers as "working".
export const PROGRESS_DELAY_MS = 200

// Thin top-of-page bar for any in-flight query fetch (first load or background refetch) or
// mutation. Reads that bypass TanStack Query are invisible here, so data loads go through it.
export function GlobalProgress() {
  const active = useIsFetching() + useIsMutating() > 0
  const [store, progress] = useMemo(() => createNprogress(), [])
  const started = useRef(false)

  useEffect(() => {
    if (!active) {
      if (started.current) progress.complete()
      started.current = false
      return
    }
    const timer = window.setTimeout(() => {
      started.current = true
      progress.start()
    }, PROGRESS_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [active, progress])

  useEffect(() => () => progress.cleanup(), [progress])

  return (
    <NavigationProgress
      store={store}
      data-testid="global-progress"
      aria-label="Loading in progress"
    />
  )
}
