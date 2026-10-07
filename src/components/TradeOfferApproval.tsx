import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Checkbox, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { ApiError } from '../api/client'
import { approveTradeOffer, getTradeProposalStates, validApprover, validOfferKey } from '../api/tradeApproval'
import { queryClient } from '../api/queryClient'
import type { DraftConfig, TradeOffer } from '../api/types'
import { canReview, offerFingerprint, retryProven, readApprovalAttempt, saveApprovalAttempt, scope, statusCopy, useApprovalAttempt, useApprovalAttempts } from './tradeApprovalState'

function useTradeStatuses(config: DraftConfig, poll = false) {
  const attempts = useApprovalAttempts(config)
  return useQuery({ queryKey: ['trade-approval-status', scope(config)], queryFn: () => getTradeProposalStates(config),
    staleTime: 0, retry: false,
    refetchInterval: query => {
      if (!poll) return false
      const rows = query.state.data || []
      const complete = (key: string) => rows.some(row => row.offer_key === key && ['submitted', 'submit_blocked', 'failure', 'dry_run_filled'].includes(row.status))
      const outstanding = rows.some(row => ['approval_pending', 'submitting', 'approved'].includes(row.status) && !complete(row.offer_key || '')) ||
        attempts.some(([key, attempt]) => !complete(key) && !retryProven(attempt, rows.filter(row => row.offer_key === key)))
      return outstanding ? 10_000 : false
    }, refetchIntervalInBackground: false }, queryClient)
}
function approvalError(error: unknown) {
  const reason = error instanceof Error ? error.message : 'No response received.'
  const status = error instanceof ApiError ? error.status : 0
  const copy = status === 404 ? 'This offer could not be found. Refresh proposals before reviewing another offer.'
    : status === 409 ? 'This offer cannot be approved in its current state. Pending or unknown outcomes require operator reconciliation before retrying.'
    : status === 422 ? 'Approval request was rejected. Correct the input and review again.'
    : status === 503 ? 'Publication failed; the offer may still have been queued. Checking status…'
    : status >= 400 && status < 500 ? 'Approval was rejected.'
    : 'Approval outcome is unknown. Do not approve again until status is resolved.'
  return `${copy} ${reason}`
}
interface ApprovalProps {
  config: DraftConfig; offer: TradeOffer; counterparty: string; disabled: boolean
}
export function TradeOfferApproval(props: ApprovalProps) {
  return <OfferApprovalDialog key={`${scope(props.config)}:${offerFingerprint(props.offer)}:${props.counterparty}`} {...props} />
}
function OfferApprovalDialog({ config, offer, counterparty, disabled }: ApprovalProps) {
  const query = useTradeStatuses(config)
  const key = offer.offer_key || ''
  const attempt = useApprovalAttempt(key)
  const [open, setOpen] = useState(false)
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState('')
  const [checked, setChecked] = useState(false)
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  const lifecycle = useRef({ active: true })
  const currentScope = scope(config)
  const fingerprint = offerFingerprint(offer)
  useEffect(() => {
    const owner = lifecycle.current
    owner.active = true
    // Invalidate pending verification when this reviewed scope or offer unmounts.
    return () => { owner.active = false }
  }, [])
  const retryable = Boolean(attempt && !query.isFetching && !query.isError && query.data &&
    retryProven(attempt, query.data.filter(row => row.offer_key === key)))
  const eligible = validOfferKey(key) && !disabled && (!attempt || retryable) && !query.isError &&
    Boolean(query.data && canReview(offer, config, query.data))
  async function verify() {
    const result = await query.refetch()
    if (result.isError || !result.data) throw new Error('Could not verify the current outcome. Refresh status before approving.')
    if (!canReview(offer, config, result.data)) throw new Error('This offer cannot be approved in its current state. Refresh proposals and review the current details.')
    return result.data.filter(row => row.offer_key === key)
  }
  async function review() {
    if (lock.current || !eligible) return
    lock.current = true
    const owner = lifecycle.current
    setOpen(true); setBusy(true); setVerified(false); setChecked(false); setLabel(''); setMessage('')
    try { await verify(); if (owner.active) setVerified(true) }
    catch (error) { if (owner.active) setMessage(error instanceof Error ? error.message : 'Could not verify the current outcome.') }
    finally { lock.current = false; if (owner.active) setBusy(false) }
  }
  async function confirm() {
    if (lock.current || !eligible || !verified || !checked || !validApprover(label)) return
    lock.current = true
    const owner = lifecycle.current
    setBusy(true)
    let sent = false
    let priorTrackingId: string | undefined
    const details = { configScope: currentScope, counterparty, fingerprint }
    try {
      const rows = await verify()
      if (!owner.active) return
      priorTrackingId = rows.find(row => row.approval?.tracking_id)?.approval?.tracking_id
      const stored = readApprovalAttempt(key)
      if (stored && !retryProven(JSON.parse(stored), rows)) throw new Error('Approval is already pending or its outcome is unknown. Refresh status before retrying.')
      saveApprovalAttempt(key, { ...details, message: 'Approval outcome is unknown. Checking status…', priorTrackingId })
      sent = true
      const response = await approveTradeOffer(key, label.trim())
      saveApprovalAttempt(key, { ...details, response, message: response.duplicate
        ? 'This offer was already approved; no additional offer was queued.'
        : 'Offer queued. ESPN submission is not yet confirmed.' })
    } catch (error) {
      if (sent) {
        if (error instanceof ApiError && error.status === 422) {
          saveApprovalAttempt(key, null)
        } else {
          saveApprovalAttempt(key, { ...details, message: approvalError(error), publicationFailed: error instanceof ApiError && error.status === 503,
            priorTrackingId })
        }
      }
      if (owner.active) setMessage(sent ? approvalError(error) : error instanceof Error ? error.message : 'Could not verify the current outcome.')
    } finally {
      lock.current = false
      if (owner.active) { setBusy(false); setVerified(false); setChecked(false); if (sent) setOpen(false) }
      // Only reads are retried/refreshed; a failed HTTP write may already have published.
      void queryClient.invalidateQueries({ queryKey: ['outgoing-trade-proposals', config.league_id, config.team_id, config.season] })
      void query.refetch()
    }
  }
  return <Stack gap="xs" mt="sm">
    <Button size="xs" variant="light" disabled={!eligible || busy} onClick={() => { void review() }}>Review approval</Button>
    {!validOfferKey(key) && <Text size="sm">Approval unavailable: no valid supplied offer key.</Text>}
    {message && !attempt && !open && <Alert color="yellow">{message}</Alert>}
    <Modal opened={open} onClose={() => { if (!busy) setOpen(false) }} title="Review trade approval" closeOnClickOutside={!busy} closeOnEscape={!busy} withCloseButton={!busy}>
      <Stack>
        <Text>League {config.league_id}, season {config.season}, your team {config.team_id}</Text>
        <Text fw={600}>{counterparty} (Team {offer.to_team_id})</Text>
        {(['incoming', 'outgoing'] as const).map(side => <div key={side}>
          <Text fw={600}>{side === 'incoming' ? 'You receive' : 'You send'}</Text>
          <ul>{offer[`${side}_player_ids`].map(id => {
            const name = offer[`${side}_players`].find(player => player.espn_id === id)?.name
            return <li key={id}>{name ? `${name} (ESPN ${id})` : `ESPN player ${id}`}</li>
          })}</ul>
        </div>)}
        <Text data-testid="approval-pitch" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{offer.message ?? 'No pitch provided.'}</Text>
        <Alert color="yellow">Approving queues this exact offer. The worker may propose a real trade to this manager in ESPN.</Alert>
        <TextInput label="Approver label" description="Self-reported name for the approval audit; this is not a verified account identity." value={label} onChange={event => setLabel(event.currentTarget.value)} disabled={busy} error={label && !validApprover(label) ? 'Enter a nonblank label of at most 200 characters.' : undefined} />
        <Checkbox label="I have reviewed these players, counterparty and pitch." checked={checked} onChange={event => setChecked(event.currentTarget.checked)} disabled={busy} />
        {busy && !verified && <Text>Verifying current offer…</Text>}
        {message && <Alert color="red">{message}</Alert>}
        <Group><Button variant="default" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={busy || !verified || !eligible || !checked || !validApprover(label)} onClick={() => { void confirm() }}>{busy && verified ? 'Requesting approval…' : 'Approve and queue offer'}</Button></Group>
      </Stack>
    </Modal>
  </Stack>
}
export function TradeApprovalStatus({ config }: { config: DraftConfig }) {
  const query = useTradeStatuses(config, true)
  const attempts = useApprovalAttempts(config)
  const groups = new Map<string, TradeOffer[]>()
  for (const row of query.data || []) {
    if (!row.offer_key) continue
    groups.set(row.offer_key, [...(groups.get(row.offer_key) || []), row])
  }
  return <Stack gap="xs" mt="sm" aria-label="Trade approval status">
    <Button variant="default" size="xs" loading={query.isFetching} onClick={() => { void query.refetch() }}>Refresh status</Button>
    {query.isError && <Alert color="yellow">Could not verify the current outcome. Previously recorded statuses may be out of date. {query.error.message}</Alert>}
    {attempts.map(([key, attempt]) => <Alert key={key} color={attempt.response ? 'blue' : 'yellow'}>
      <Text fw={600}>Offer to {attempt.counterparty || 'counterparty'}</Text>
      <Text>{!query.isFetching && !query.isError && retryProven(attempt, query.data?.filter(row => row.offer_key === key) || [])
        ? 'Failed before publication; review again before retrying.'
        : !attempt.response && !query.isError && query.data?.some(row => row.offer_key === key && row.status === 'approved' && row.approval?.tracking_id)
          ? 'Offer is recorded as queued. ESPN submission is not yet confirmed.'
          : !attempt.response && !query.isError && query.data?.some(row => row.offer_key === key && row.status === 'submitted')
            ? 'Approval request outcome reconciled by the worker’s recorded submission.'
            : attempt.message}</Text>
      {!query.isFetching && !query.isError && query.data && !query.data.some(row => row.offer_key === key) &&
        <Text>Could not verify the current outcome: no matching status record was returned.</Text>}
      {attempt.response && <Text size="sm">Approved by {attempt.response.approved_by} at {attempt.response.approved_at}. Tracking ID: {attempt.response.tracking_id}</Text>}
      <Text size="xs" style={{ overflowWrap: 'anywhere' }}>Offer key: {key}</Text>
    </Alert>)}
    {[...groups].map(([key, rows]) => {
      const active = rows.filter(row => row.status !== 'awaiting_approval')
      if (!active.length) return null
      // Approval and worker rows coexist. A worker confirmation outranks queue acceptance,
      // while contradictory terminal records stay visible rather than being guessed away.
      const statuses = [...new Set(active.map(row => row.status))]
      const displayed = statuses.includes('submitted') && statuses.every(status => ['submitted', 'submitting', 'approved'].includes(status)) ? ['submitted'] : statuses
      return <Alert key={key} color={displayed.length === 1 && displayed[0] === 'submitted' ? 'green' : 'blue'}>
        <Text fw={600}>Offer to Team {rows[0].to_team_id}</Text>
        {displayed.map(status => <Text key={status}>{statusCopy[status] || 'Outcome unconfirmed'}</Text>)}
        {displayed.length > 1 && <Text>Multiple states recorded; operator reconciliation may be required.</Text>}
        <Text size="xs" style={{ overflowWrap: 'anywhere' }}>Offer key: {key}</Text>
        {active.filter(row => row.approval?.tracking_id).slice(0, 1).map(row => <Text key={row.id} size="sm">Tracking ID: {row.approval?.tracking_id}</Text>)}
      </Alert>
    })}
  </Stack>
}
