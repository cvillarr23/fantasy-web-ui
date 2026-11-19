import { useState } from 'react'
import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { ApiError } from '../api/client'
import { dismissTradeOffer, validApprover, validOfferKey } from '../api/tradeApproval'
import { queryClient } from '../api/queryClient'
import type { DraftConfig, TradeOffer } from '../api/types'

/** A 409 means the offer left awaiting approval first, almost always because someone approved it. */
function dismissError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) return 'This offer is no longer awaiting approval, so it was not dismissed. Refresh proposals to see its current state.'
  if (error instanceof ApiError && error.status === 404) return 'This offer could not be found. Refresh proposals.'
  return `Could not dismiss this offer. ${error instanceof Error ? error.message : ''}`.trim()
}

export function DismissProposal({ config, offer, counterparty, disabled }: {
  config: DraftConfig; offer: TradeOffer; counterparty: string; disabled: boolean
}) {
  const key = offer.offer_key || ''
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  async function dismiss() {
    if (busy || !validApprover(label)) return
    setBusy(true); setError('')
    try {
      await dismissTradeOffer(key, label)
      setOpen(false)
    } catch (caught) {
      setError(dismissError(caught))
    } finally {
      setBusy(false)
      void queryClient.invalidateQueries({ queryKey: ['outgoing-trade-proposals', config.league_id, config.team_id, config.season] })
    }
  }
  if (!validOfferKey(key)) return null
  return <>
    <Button size="xs" variant="subtle" color="gray" disabled={disabled || busy}
      onClick={() => { setLabel(''); setError(''); setOpen(true) }}>Dismiss</Button>
    {error && !open && <Alert color="yellow" mt="xs">{error}</Alert>}
    <Modal opened={open} onClose={() => { if (!busy) setOpen(false) }} title="Dismiss proposal" closeOnClickOutside={!busy} closeOnEscape={!busy} withCloseButton={!busy}>
      <Stack>
        <Text size="sm">Remove this proposal to {counterparty} from the list. Nothing is sent to {counterparty}.</Text>
        <TextInput label="Your name" value={label} onChange={event => setLabel(event.currentTarget.value)} maxLength={200} data-autofocus />
        {error && <Alert color="yellow">{error}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
          <Button color="red" loading={busy} disabled={!validApprover(label)} onClick={() => { void dismiss() }}>Dismiss proposal</Button>
        </Group>
      </Stack>
    </Modal>
  </>
}
