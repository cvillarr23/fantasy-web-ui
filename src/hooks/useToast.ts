import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastTone = 'success' | 'error'

export interface Toast {
  tone: ToastTone
  message: string
}

const DEFAULT_DISMISS_MS = 5_000

/** Manual picks and one-click drafts happen mid-timer under real time pressure - a status
 * line that just sits there until the next action overwrites it is easy to miss. This gives
 * every caller the same auto-dismissing, tone-styled toast instead of a plain <p>. */
export function useToast(dismissAfterMs = DEFAULT_DISMISS_MS) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const showToast = useCallback(
    (tone: ToastTone, message: string) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      setToast({ tone, message })
      timerRef.current = window.setTimeout(() => setToast(null), dismissAfterMs)
    },
    [dismissAfterMs],
  )

  return { toast, showToast }
}
