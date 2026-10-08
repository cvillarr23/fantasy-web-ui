import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Checkbox, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { validApprover } from '../../api/tradeApproval'
import { retryableResponse, retryIncomingDecision } from '../../api/tradeResponseRetry'
import type { InboxResponse, RetryReceipt } from '../../api/tradeResponseRetry'
import { readAttempt, recordAttempt, saveAttempt, useAttempt } from './inboxState'
import type { InboxAttempt } from './inboxState'

export interface RetryableOffer {
  espn_transaction_id: string
  proposing_team_id: string | null
  comment: string | null
  responseComment?: string | null
  send_players: { espn_id: string; name: string | null }[]
  receive_players: { espn_id: string; name: string | null }[]
  response?: InboxResponse | null
}
type Outcome = { color: 'blue' | 'red' | 'yellow'; message: string; final: boolean }
function failure(err: unknown): Outcome {
  const reason = err instanceof Error ? err.message : 'No verified response received.'
  const status = err instanceof ApiError ? err.status : 0
  if (status === 422)
    return {
      color: 'yellow',
      message: `Request rejected — correct the input and review again. ${reason}`,
      final: false,
    }
  if (status === 404)
    return {
      color: 'red',
      message: `Response not found. Refresh the inbox before reviewing again. ${reason}`,
      final: true,
    }
  if (status === 409)
    return {
      color: 'red',
      message: `Request conflicted — reconciliation required. ${reason}`,
      final: true,
    }
  return {
    color: 'red',
    message: `Outcome unknown — manual verification required. Do not repeat. ${reason}`,
    final: true,
  }
}

export function RetryResponseButton({
  offer,
  onQueued,
  disabled = false,
  verify,
  safetyKey,
}: {
  offer: RetryableOffer
  onQueued?: (receipt: RetryReceipt) => void
  disabled?: boolean
  verify?: () => Promise<void>
  safetyKey?: string
}) {
  const kind = retryableResponse(offer.response)
  const key =
    safetyKey ?? `fantasy-web-ui.inbox-retry.${offer.espn_transaction_id}:${offer.response?.id}`
  const attempt = useAttempt(key)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [checked, setChecked] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const lock = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  if (!kind || !offer.response) return null
  const response = offer.response
  const action = response.action as 'accept' | 'decline'
  const ready =
    !disabled &&
    !busy &&
    !attempt &&
    validApprover(label) &&
    reviewed &&
    (kind === 'rejected' || checked)
  const done = outcome?.final === true || Boolean(attempt)

  async function confirm() {
    if (lock.current || !ready) return
    lock.current = true
    setBusy(true)
    setOutcome(null)
    let sent = false
    let marker: InboxAttempt | undefined
    try {
      await verify?.()
      if (!active.current) return
      if (readAttempt(key)) throw new Error('An earlier retry requires reconciliation.')
      marker = {
        signature: JSON.stringify(offer),
        action,
        comment: offer.responseComment ?? null,
        approvedBy: label.trim(),
        startedAt: new Date().toISOString(),
        priorTrackingIds: [],
        decisionKey: response.decision_key!,
        transactionId: offer.espn_transaction_id,
        message: 'Retry outcome unknown — checking publication status. Do not repeat.',
      }
      // Retain uncertainty before POST because leaving the page cannot cancel publication.
      saveAttempt(key, marker)
      sent = true
      const receipt = await retryIncomingDecision(
        offer.espn_transaction_id,
        response,
        label,
        kind === 'unknown' && checked,
      )
      recordAttempt(key, {
        ...marker,
        response: receipt,
        message: 'Retry queued — ESPN outcome unconfirmed.',
      })
      if (active.current)
        setOutcome({
          color: 'blue',
          message: 'Retry queued — ESPN outcome unconfirmed.',
          final: true,
        })
      onQueued?.(receipt)
    } catch (err) {
      const next = failure(err)
      if (sent && marker)
        recordAttempt(key, next.final ? { ...marker, message: next.message } : null)
      if (active.current) setOutcome(sent ? next : { ...next, final: false })
    } finally {
      lock.current = false
      if (active.current) {
        setBusy(false)
        setReviewed(false)
        setChecked(false)
      }
    }
  }
  const message = outcome?.message ?? attempt?.message
  return (
    <Stack gap="xs">
      {!done && (
        <Button
          variant="light"
          color="orange"
          disabled={disabled || busy}
          onClick={() => {
            setOpen(true)
            setLabel('')
            setReviewed(false)
            setChecked(false)
            setOutcome(null)
          }}
        >
          Retry {action}
        </Button>
      )}
      {!open && message && (
        <Alert color={outcome?.color ?? 'yellow'}>
          <Text>{message}</Text>
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
            Proposer Team {offer.proposing_team_id} · Offer {offer.espn_transaction_id} · Worker
            response {response.id}
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
          <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {offer.comment ?? 'No note provided.'}
          </Text>
          <Text fw={600}>Previously approved response comment</Text>
          <Text
            data-testid="retry-response-comment"
            style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
          >
            {offer.responseComment ?? 'No stored response comment.'}
          </Text>
          <Alert color="yellow">
            {kind === 'rejected'
              ? `ESPN rejected the earlier ${action}, so it was not processed. Retrying queues the same ${action} and response comment again.`
              : `The earlier ${action} may already have reached ESPN. Retry only after checking ESPN shows this offer still pending and unanswered. The worker checks again before sending.`}{' '}
            Responses are disabled in the supplied production configuration; queueing does not
            confirm an ESPN outcome.
          </Alert>
          <TextInput
            label="Approver label"
            description="Self-reported audit label, not a verified account identity."
            value={label}
            disabled={busy || done}
            onChange={(e) => setLabel(e.currentTarget.value)}
          />
          <Checkbox
            label="I reviewed these exact players and notes."
            checked={reviewed}
            disabled={busy || done}
            onChange={(e) => setReviewed(e.currentTarget.checked)}
          />
          {kind === 'unknown' && (
            <Checkbox
              label="I checked ESPN and this offer wasn't answered."
              checked={checked}
              disabled={busy || done}
              onChange={(e) => setChecked(e.currentTarget.checked)}
            />
          )}
          {message && <Alert color={outcome?.color ?? 'yellow'}>{message}</Alert>}
          {done && !busy ? (
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
