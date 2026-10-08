import { useRef, useState } from 'react'
import { Alert, Button, Group, Modal, Stack, TextInput } from '@mantine/core'
import { triageIncoming } from '../../api/tradeInbox'
import { validApprover } from '../../api/tradeApproval'
import type { IncomingTrade, TriageState } from '../../api/tradeInboxTypes'
function futureSnooze(value: string): Date | null {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getTime() > Date.now() ? date : null
}
export function IncomingTradeTriage({
  row,
  disabled,
  refresh,
}: {
  row: IncomingTrade
  disabled: boolean
  refresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [until, setUntil] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  async function save(state: TriageState) {
    if (lock.current || disabled || !validApprover(label)) return
    const date = futureSnooze(until)
    if (state === 'snoozed' && !date) {
      setError('Choose a future snooze time.')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await triageIncoming(row.espn_transaction_id, {
        state,
        by: label.trim(),
        ...(state === 'snoozed' ? { snooze_until: date!.toISOString() } : {}),
      })
      setOpen(false)
    } catch (err) {
      setError(
        `Triage was not verified. Refresh before retrying. ${err instanceof Error ? err.message : ''}`,
      )
      setOpen(false)
    } finally {
      lock.current = false
      setBusy(false)
      refresh()
    }
  }
  return (
    <>
      <Button
        size="xs"
        variant="default"
        disabled={disabled || busy}
        onClick={() => {
          setOpen(true)
          setError('')
        }}
      >
        Triage
      </Button>
      {error && !open && <Alert color="yellow">{error}</Alert>}
      <Modal
        opened={open}
        onClose={() => {
          if (!busy) setOpen(false)
        }}
        title="Triage incoming offer"
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        <Stack>
          <TextInput
            label="Triage audit label"
            value={label}
            disabled={busy}
            onChange={(e) => setLabel(e.currentTarget.value)}
          />
          <TextInput
            type="datetime-local"
            label="Snooze until (your local time)"
            value={until}
            disabled={busy}
            onChange={(e) => setUntil(e.currentTarget.value)}
          />
          {error && <Alert color="red">{error}</Alert>}
          <Group>
            {(
              [
                ['seen', 'Mark seen'],
                ['snoozed', 'Snooze'],
                ['dismissed', 'Dismiss'],
                ['new', 'Restore as new'],
              ] as const
            ).map(([state, text]) => (
              <Button
                key={state}
                disabled={busy || disabled || !validApprover(label)}
                onClick={() => {
                  void save(state)
                }}
              >
                {text}
              </Button>
            ))}
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
