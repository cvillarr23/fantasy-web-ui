import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { Link } from 'react-router-dom'
import { ApiError, getCurrentWeek } from '../../api/client'
import { getIncomingTrades, publishIncoming } from '../../api/tradeInbox'
import { validApprover } from '../../api/tradeApproval'
import type { DraftConfig } from '../../api/types'
import type { InboxAction, IncomingTrade } from '../../api/tradeInboxTypes'
import {
  reviewConflict,
  actionReason,
  outcomeCopy,
  attemptKey,
  decisionKey,
  readAttempt,
  recordAttempt,
  retryProven,
  reviewSignature,
  saveAttempt,
  useAttempt,
} from './inboxState'
import type { InboxAttempt } from './inboxState'
export function IncomingTradeActions({
  row,
  config,
  week,
  disabled,
  refresh,
  onOfferChanged,
}: {
  row: IncomingTrade
  config: DraftConfig
  week?: number
  disabled: boolean
  onOfferChanged: (row: IncomingTrade) => void
  refresh: () => void
}) {
  const key = attemptKey(config, row.espn_transaction_id)
  const attempt = useAttempt(key)
  const [action, setAction] = useState<InboxAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [checked, setChecked] = useState(false)
  const [label, setLabel] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  // Verification may refresh evidence, but approval stays bound to the displayed offer.
  const [reviewed, setReviewed] = useState(row)
  const lock = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const retry = Boolean(attempt && retryProven(attempt, row))
  const blocked = disabled || Boolean(attempt && !retry)
  const matchedQueue =
    attempt?.decisionKey &&
    row.publications.find(
      (p) =>
        p.kind === 'decision' && p.status === 'queued' && p.decision_key === attempt.decisionKey,
    )
  const workerCopy = outcomeCopy(row)
  const attemptMessage =
    workerCopy !== 'Open'
      ? workerCopy
      : matchedQueue
        ? 'Decision queued — ESPN outcome unconfirmed.'
        : attempt?.message

  async function verify(selected: InboxAction, snapshot = reviewed) {
    const [rows, period] = await Promise.all([
      getIncomingTrades(config, 'all', 'all'),
      selected === 'decline' ? Promise.resolve({ week }) : getCurrentWeek(config.season),
    ])
    const copies = rows.filter((r) => r.espn_transaction_id === row.espn_transaction_id)
    if (copies.length !== 1 || reviewSignature(copies[0]) !== reviewSignature(snapshot)) {
      onOfferChanged(snapshot)
      setAction(null)
      throw new Error('Offer changed or cannot be uniquely verified. Refresh and review again.')
    }
    if (selected !== 'decline' && period.week !== week)
      throw new Error('Current week changed. Refresh and review again.')
    const reason = actionReason(copies[0], config, period.week, selected)
    if (reason) throw new Error(reason)
    return copies[0]
  }
  async function review(selected: InboxAction) {
    if (lock.current || blocked || actionReason(row, config, week, selected)) return
    lock.current = true
    setReviewed(row)
    setAction(selected)
    setBusy(true)
    setVerified(false)
    setChecked(false)
    setLabel('')
    setComment('')
    setError('')
    try {
      await verify(selected, row)
      if (active.current) setVerified(true)
    } catch (err) {
      if (active.current) setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  async function confirm() {
    if (
      !action ||
      lock.current ||
      blocked ||
      !verified ||
      !checked ||
      !validApprover(label) ||
      comment.length > 2000
    )
      return
    lock.current = true
    setBusy(true)
    setError('')
    let sent = false
    let marker: InboxAttempt | undefined
    try {
      const current = await verify(action)
      if (!active.current) return
      const normalized = comment.trim() || null
      const digest =
        action === 'counter' ? undefined : await decisionKey(current, action, normalized)
      if (!active.current) return
      const existing = readAttempt(key)
      if (existing) {
        const prior = JSON.parse(existing) as InboxAttempt
        if (!retryProven(prior, current) || prior.action !== action || prior.comment !== normalized)
          throw new Error(
            'An earlier request requires reconciliation. Only the same proven failed request can be reviewed again.',
          )
      }
      marker = {
        signature: reviewSignature(current),
        action,
        comment: normalized,
        approvedBy: label.trim(),
        startedAt: new Date().toISOString(),
        priorTrackingIds: current.publications.map((p) => p.tracking_id),
        decisionKey: digest,
        message: 'Outcome unknown — checking publication status. Do not repeat.',
      }
      // Store before sending so reloads and navigation cannot expose a second action.
      saveAttempt(key, marker)
      sent = true
      const response = await publishIncoming(
        current.espn_transaction_id,
        action === 'counter'
          ? {
              approved_by: label.trim(),
              week: week!,
              review_token: reviewed.review_token,
            }
          : {
              action,
              review_token: reviewed.review_token,
              approved_by: label.trim(),
              ...(normalized ? { comment: normalized } : {}),
            },
      )
      recordAttempt(key, {
        ...marker,
        response,
        message:
          action === 'counter'
            ? 'Negotiation queued — no ESPN counter confirmed. Later outgoing approval is required.'
            : 'Decision queued — ESPN outcome unconfirmed.',
      })
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'No verified response received.'
      const status = err instanceof ApiError ? err.status : 0
      const message =
        status === 404
          ? 'Offer not found. Refresh before reviewing again.'
          : status === 409
            ? `Request conflicted — reconciliation required. ${reason}`
            : status === 422
              ? `Request rejected — correct input and review again. ${reason}`
              : `Outcome unknown — manual verification required. ${reason}`
      if (sent && marker)
        recordAttempt(key, status === 422 || reviewConflict(err) ? null : { ...marker, message })
      if (reviewConflict(err)) onOfferChanged(reviewed)
      if (active.current && !reviewConflict(err)) setError(sent ? message : reason)
    } finally {
      lock.current = false
      if (active.current) {
        setBusy(false)
        if (sent) {
          setAction(null)
          setChecked(false)
          setVerified(false)
        }
      }
      refresh()
    }
  }
  return (
    <Stack gap="xs">
      <Group>
        {(['accept', 'decline', 'counter'] as const).map((a) => (
          <Button
            key={a}
            color={a === 'decline' ? 'red' : 'blue'}
            variant="light"
            disabled={
              blocked ||
              busy ||
              Boolean(actionReason(row, config, week, a)) ||
              (retry && attempt?.action !== a)
            }
            onClick={() => {
              void review(a)
            }}
          >
            {a[0].toUpperCase() + a.slice(1)}
          </Button>
        ))}
      </Group>
      {(['accept', 'decline', 'counter'] as const).map((a) => {
        const reason = actionReason(row, config, week, a)
        return reason ? (
          <Text key={a} size="xs">
            {a[0].toUpperCase() + a.slice(1)} unavailable: {reason}
          </Text>
        ) : null
      })}
      {attempt && (
        <Alert color={attempt.response ? 'blue' : 'yellow'}>
          <Text>
            {retry
              ? 'Failed before publication — review the same request again to retry.'
              : attemptMessage}
          </Text>
          {attempt.response && (
            <Text size="xs">
              {attempt.response.duplicate ? 'Already queued; no additional request. ' : ''}
              Tracking ID: {attempt.response.tracking_id}. Approved by{' '}
              {attempt.response.approved_by} at {attempt.response.approved_at}.
            </Text>
          )}
          <Button component={Link} to="/activity?tab=attention" variant="subtle">
            Verify in Activity
          </Button>
        </Alert>
      )}
      {error && !action && !attempt && <Alert color="yellow">{error}</Alert>}
      <Modal
        opened={action !== null}
        onClose={() => {
          if (!busy) setAction(null)
        }}
        title={`Review ${action ?? 'response'}`}
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        <Stack>
          <Text>
            League {config.league_id} · Season {config.season} · Your team {config.team_id} ·
            Proposer Team {reviewed.proposing_team_id} · Offer {reviewed.espn_transaction_id}
          </Text>
          {(['receive', 'send'] as const).map((side) => (
            <div key={side}>
              <Text fw={600}>You {side}</Text>
              <ul>
                {reviewed[`${side}_players`].map((p) => (
                  <li key={p.espn_id}>
                    {p.name || 'Unnamed player'} (ESPN {p.espn_id})
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Text fw={600}>Original proposer note</Text>
          <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {reviewed.comment ?? 'No note provided.'}
          </Text>
          {reviewed.other_items.length > 0 && (
            <Text>Other trade items: {JSON.stringify(reviewed.other_items)}</Text>
          )}
          <Alert color="yellow">
            {action === 'counter'
              ? 'This queues negotiation and staging for later outgoing approval. It does not submit an ESPN counter.'
              : `Confirming queues ${action} for this exact offer. Responses are disabled in the supplied production configuration. Once enabled, the worker may change a real ESPN trade with this manager.`}
          </Alert>
          {action === 'counter' ? (
            <Text>Negotiation week: {week}</Text>
          ) : (
            <Textarea
              label="Response comment"
              description="Your response note, separate from the proposer’s note. Whitespace at the ends is trimmed."
              value={comment}
              disabled={busy}
              onChange={(e) => {
                setComment(e.currentTarget.value)
                setChecked(false)
              }}
              error={comment.length > 2000 ? 'Maximum 2000 characters.' : undefined}
            />
          )}
          <TextInput
            label="Approver label"
            description="Self-reported audit label, not a verified account identity."
            value={label}
            disabled={busy}
            onChange={(e) => setLabel(e.currentTarget.value)}
          />
          <Checkbox
            label="I reviewed these exact players and notes."
            checked={checked}
            disabled={busy}
            onChange={(e) => setChecked(e.currentTarget.checked)}
          />
          {busy && !verified && <Text>Verifying current offer…</Text>}
          {action && error && <Alert color="red">{error}</Alert>}
          <Group>
            <Button variant="default" disabled={busy} onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy || !verified || !checked || !validApprover(label) || comment.length > 2000
              }
              onClick={() => {
                void confirm()
              }}
            >
              {action === 'counter' ? 'Queue negotiation' : `Confirm ${action} and queue`}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
