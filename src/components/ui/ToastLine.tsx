import type { Toast } from '../../hooks/useToast'

/** The auto-dismissing status line from `useToast`, styled by tone. Renders nothing
 * without a toast. */
export function ToastLine({ toast }: { toast: Toast | null }) {
  if (!toast) return null
  return <p className={`status-message toast toast-${toast.tone}`}>{toast.message}</p>
}
