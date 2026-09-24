import { useState } from 'react'
import { Badge, Button, Modal, Stack, Text } from '@mantine/core'
import { isClaimAlreadyActiveError, triggerWaiverClaim } from '../api/client'
import { InjuryBadge } from './InjuryBadge'
import { RumorBadge } from './RumorBadge'
import { useToast } from '../hooks/useToast'
import type { DraftConfig, WaiverRecommendation } from '../api/types'

interface Props {
  recommendations: WaiverRecommendation[]
  config: DraftConfig
}

interface PendingClaim {
  key: string
  position: string
  addId: string
  addName: string
  dropId: string
  dropName: string
}

export function WaiverRecommendationPanel({ recommendations, config }: Props) {
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null)
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)
  const { toast, showToast } = useToast()

  async function handleConfirm() {
    if (!pendingClaim) return
    const claim = pendingClaim
    setSubmittingKey(claim.key)
    setPendingClaim(null)
    try {
      await triggerWaiverClaim(config, claim.addId, claim.addName, claim.dropId, claim.dropName)
      showToast('success', `Claim submitted: add ${claim.addName}, drop ${claim.dropName}.`)
    } catch (err) {
      showToast(
        'error',
        isClaimAlreadyActiveError(err)
          ? 'Claim already submitted this week.'
          : `Claim failed: ${String(err)}`,
      )
    } finally {
      setSubmittingKey(null)
    }
  }

  return (
    <section className="waiver-recommendation-panel">
      <h3>Waiver pickups</h3>
      {recommendations.length === 0 ? (
        <Text c="dimmed" size="sm">No waiver upgrades this week.</Text>
      ) : (
        <ul className="waiver-recommendation-list">
          {recommendations.map(({ position, vorp_delta, free_agent, bench_player, rumor_sentiment, rumor_confidence, rumor_suggested_action }) => {
            const key = `${position}-${free_agent.espn_id ?? free_agent.name}`
            const canClaim = Boolean(free_agent.espn_id && bench_player.espn_id)
            return (
              <li key={key} className="waiver-recommendation-row">
                <span className="waiver-recommendation-players">
                  <span>
                    {free_agent.name} ({position})
                    <InjuryBadge status={free_agent.injury_status} />
                    <RumorBadge
                      sentiment={rumor_sentiment}
                      confidence={rumor_confidence}
                      suggestedAction={rumor_suggested_action}
                    />
                  </span>
                  <span aria-hidden="true"> → </span>
                  <span>
                    {bench_player.name}
                    <InjuryBadge status={bench_player.injury_status} />
                  </span>
                </span>
                <Badge color={vorp_delta > 0 ? 'green' : 'gray'} size="sm">
                  VORP {vorp_delta >= 0 ? '+' : ''}{vorp_delta.toFixed(1)}
                </Badge>
                <Button
                  size="xs"
                  disabled={!canClaim}
                  loading={submittingKey === key}
                  onClick={() =>
                    setPendingClaim({
                      key,
                      position,
                      addId: free_agent.espn_id as string,
                      addName: free_agent.name,
                      dropId: bench_player.espn_id as string,
                      dropName: bench_player.name,
                    })
                  }
                >
                  Submit ESPN claim
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      <Modal opened={pendingClaim !== null} onClose={() => setPendingClaim(null)} title="Confirm waiver claim">
        {pendingClaim && (
          <Stack gap="md">
            <Text size="sm">
              Add <strong>{pendingClaim.addName}</strong> ({pendingClaim.position}), drop{' '}
              <strong>{pendingClaim.dropName}</strong>. This submits a real ESPN waiver claim.
            </Text>
            <Button onClick={handleConfirm}>Confirm claim</Button>
          </Stack>
        )}
      </Modal>
      {toast && <p className={`status-message toast toast-${toast.tone}`}>{toast.message}</p>}
    </section>
  )
}
