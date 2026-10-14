import { useCallback, useRef } from 'react'
import type { CSSProperties } from 'react'

/**
 * Deep links from phone notifications (`?offer=<id>`) land on a list page. The linked card is
 * scrolled into view once and outlined; when nothing matches (already handled, hidden, or not
 * loaded yet) the page renders as usual.
 */
export function useLinkedOffer(linkedId: string | null | undefined) {
  const scrolledTo = useRef<string | null>(null)
  const isLinked = useCallback((id: string | null | undefined) => Boolean(linkedId) && id === linkedId, [linkedId])
  const refFor = useCallback(
    (id: string | null | undefined) => (node: HTMLElement | null) => {
      if (!node || !linkedId || id !== linkedId || scrolledTo.current === linkedId) return
      scrolledTo.current = linkedId
      node.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    },
    [linkedId],
  )
  return { isLinked, refFor }
}

export const linkedOfferStyle: CSSProperties = {
  borderColor: 'var(--mantine-color-yellow-6)',
  borderWidth: 2,
}
