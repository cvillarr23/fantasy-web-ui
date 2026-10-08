import { useRef, useState } from 'react'
import { Alert, Button, Checkbox, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { validApprover } from '../../api/tradeApproval'
import { retryableResponse, retryIncomingDecision } from '../../api/tradeResponseRetry'
import type { InboxResponse, RetryReceipt } from '../../api/tradeResponseRetry'

/** The parts of an incoming-offer row the retry needs. Any listed inbox row satisfies it. */
export interface RetryableOffer {
  espn_transaction_id: string
  proposing_team_id: string | null
  comment: string | null
  send_players: { espn_id: string; name: string | null }[]
  receive_players: { espn_id: string; name: string | null }[]
  response?: InboxResponse | null
}

type Outcome = { color: 'green' | 'red' | 'yellow'; message: string; final: boolean }

function failure(err: unknown): Outcome {
  const reason = err instanceof Error ? err.message : 'No verified response received.'
  const status = err instanceof ApiError ? err.status : 0
  if (status === 422) return { color: 'yellow', message: `Request rejected — correct the input and send again. ${reason}`, final: false }
  if (status === 404) return { color: 'red', message: `Response not found. Refresh the inbox before reviewing again. ${reason}`, final: true }
  if (status === 409) return { color: 'red', message: `Request conflicted — reconciliation required. ${reason}`, final: true }
  return { color: 'red', message: `Outcome unknown — manual verification required. Do not repeat. ${reason}`, final: true }
}

/**
 * Retry for a response the worker could not complete: one ESPN rejected, or one whose outcome no
 * read could confirm. Every retry is an explicit, reviewed human click; an unknown outcome also
 * needs the reviewer to confirm they checked ESPN. Once a retry has been sent (or might have been)
 * the button stays gone until the inbox is refreshed, so a second click can't queue another.
 */
export function RetryResponseButton({ offer, onQueued }: { offer: RetryableOffer; onQueued?: (receipt: RetryReceipt) => void }) {
  const kind = retryableResponse(offer.response)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const lock = useRef(false)

  if (!kind || !offer.response) return null
  const response = offer.response
  const action = response.action
  const ready = !busy && validApprover(label) && (kind === 'rejected' || checked)
  const done = outcome?.final === true

  async function confirm() {
    if (lock.current || !ready) return
    lock.current = true
    setBusy(true)
    setOutcome(null)
    try {
      const receipt = await retryIncomingDecision(offer.espn_transaction_id, response, label, kind === 'unknown' && checked)
      setOutcome({ color: 'green', message: 'Retry queued — ESPN outcome unconfirmed.', final: true })
      onQueued?.(receipt)
    } catch (err) {
      const next = failure(err)
      setOutcome(next)
      if (!next.final) lock.current = false
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="xs">
      {!done && (
        <Button variant="light" color="orange" onClick={() => setOpen(true)}>
          Retry {action}
        </Button>
      )}
      {done && !open && outcome && (
        <Alert color={outcome.color}>
          <Text>{outcome.message}</Text>
          <Button component={Link} to="/activity?tab=attention" variant="subtle">
            Verify in Activity
          </Button>
        </Alert>
      )}
      <Modal
        opened={open}
        onClose={() => {
          if (!busy) setOpen(false)
        }}
        title={`Retry ${action}`}
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        <Stack>
          <Text>
            Proposer Team {offer.proposing_team_id} · Offer {offer.espn_transaction_id} · Worker response {response.id}
          </Text>
          {(['receive', 'send'] as const).map((side) => (
            <div key={side}>
              <Text fw={600}>You {side}</Text>
              <ul>
                {offer[`${side}_players`].map((p) => (
                  <li key={p.espn_id}>
                    {p.name || 'Unnamed player'} (ESPN {p.espn_id})
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Text fw={600}>Original proposer note</Text>
          <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{offer.comment ?? 'No note provided.'}</Text>
          <Alert color="yellow">
            {kind === 'rejected'
              ? `ESPN rejected the earlier ${action}, so it was not processed. Retrying queues the same ${action} again for this exact offer.`
              : `The earlier ${action} may already have reached ESPN: no read could confirm it. Retry only after checking ESPN shows this offer still pending and unanswered. The worker checks again before sending.`}
          </Alert>
          <TextInput
            label="Approver label"
            description="Self-reported audit label, not a verified account identity."
            value={label}
            disabled={busy || done}
            onChange={(e) => setLabel(e.currentTarget.value)}
          />
          {kind === 'unknown' && (
            <Checkbox
              label="I checked ESPN and this offer wasn't answered."
              checked={checked}
              disabled={busy || done}
              onChange={(e) => setChecked(e.currentTarget.checked)}
            />
          )}
          {outcome && <Alert color={outcome.color}>{outcome.message}</Alert>}
          {done ? (
            <Group>
              <Button variant="default" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button component={Link} to="/activity?tab=attention" variant="subtle">
                Verify in Activity
              </Button>
            </Group>
          ) : (
            <Group>
              <Button variant="default" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!ready}
                onClick={() => {
                  void confirm()
                }}
              >
                Retry {action} and queue
              </Button>
            </Group>
          )}
        </Stack>
      </Modal>
    </Stack>
  )
}
