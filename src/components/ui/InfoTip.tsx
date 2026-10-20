import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Popover } from '@mantine/core'

export interface InfoTipProps {
  /** The term being explained; used in the button's accessible name. */
  label: string
  children: ReactNode
}

/** A portalled explanation stays visible inside scrolling tables and narrow cards. */
export function InfoTip({ label, children }: InfoTipProps) {
  const id = useId()
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(closeTimer.current), [])
  const cancelClose = () => clearTimeout(closeTimer.current)
  const closeSoon = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpened(false), 120)
  }
  const [opened, setOpened] = useState(false)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    if (!opened) return
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearTimeout(closeTimer.current)
        setOpened(false)
        setPinned(false)
      }
    }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [opened])
  return (
    <Popover opened={opened} onChange={(next) => { setOpened(next); if (!next) setPinned(false) }} withRoles={false} width={280} position="bottom-start" withinPortal
      shadow="md" closeOnEscape closeOnClickOutside>
      <Popover.Target>
        <button type="button" className="info-tip" aria-label={`What is ${label}?`}
          aria-expanded={opened} aria-describedby={opened ? id : undefined}
          onMouseEnter={() => { cancelClose(); setOpened(true) }}
          onMouseLeave={(event) => { if (!pinned && event.currentTarget !== document.activeElement) closeSoon() }}
          onFocus={() => { cancelClose(); setOpened(true) }}
          onBlur={() => { setOpened(false); setPinned(false) }}
          onClick={() => { cancelClose(); setPinned(!pinned); setOpened(!pinned) }}>?</button>
      </Popover.Target>
      <Popover.Dropdown onMouseEnter={cancelClose} onMouseLeave={() => { if (!pinned && document.activeElement?.getAttribute('aria-describedby') !== id) closeSoon() }} id={id} role="tooltip" className="info-tip-popover">{children}</Popover.Dropdown>
    </Popover>
  )
}
