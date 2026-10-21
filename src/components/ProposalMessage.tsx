import { useId, useState } from 'react'
import { Badge, Button, Group, Stack, Text, Textarea } from '@mantine/core'
import { validTradeMessage } from '../api/tradeApproval'
import { InfoTip } from './ui/InfoTip'

export function ProposalMessage({ value, draft, counterparty, onChange, onEditingChange, readOnly = false }: {
  value: string; draft: string; counterparty: string; readOnly?: boolean
  onChange: (message: string) => void
  onEditingChange: (editing: boolean) => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [buffer, setBuffer] = useState(value)
  const edited = readOnly || value !== draft
  function edit(active: boolean) { setEditing(active); onEditingChange(active) }
  return <Stack gap="sm">
    <Button variant="transparent" px={0} style={{ alignSelf: 'flex-start' }} aria-expanded={open} aria-controls={id}
      onClick={() => { setOpen(!open); if (open) edit(false) }}>
      {edited ? 'Read your edited message' : 'Read generated message'}
    </Button>
    {open && <Stack id={id} gap="xs">
      {editing ? <>
        <Textarea label={`Message to ${counterparty}`} value={buffer} rows={5}
          onChange={event => setBuffer(event.currentTarget.value)} />
        <Group justify="space-between">
          <Text size="xs" c={[...buffer].length > 1000 ? 'red' : 'dimmed'}>{[...buffer].length} / 1000 characters</Text>
          <Group gap="xs">
            <Button variant="default" onClick={() => edit(false)}>Cancel</Button>
            <Button disabled={!validTradeMessage(buffer)} onClick={() => { onChange(buffer); edit(false) }}>Save message</Button>
          </Group>
        </Group>
      </> : <>
        <blockquote className="proposal-message">{value || 'No explanation provided.'}</blockquote>
        <Group gap="xs">
          {!readOnly && <Button size="xs" variant="default" onClick={() => { setBuffer(value); edit(true) }}>Edit message</Button>}
          {edited && <>
            <Badge variant="light">Edited by you</Badge>
            {!readOnly && <Button size="xs" variant="subtle" onClick={() => onChange(draft)}>Reset to generated draft</Button>}
            <InfoTip label="edited messages">The generated draft only states facts backed by the trade score. Edited text is sent exactly as written and isn't checked against the score. The original draft is kept with the offer.</InfoTip>
          </>}
        </Group>
        {readOnly && <Text size="xs" c="dimmed">This message is already saved with this offer and cannot be edited again. The generated draft is kept with the offer.</Text>}
      </>}
    </Stack>}
  </Stack>
}
