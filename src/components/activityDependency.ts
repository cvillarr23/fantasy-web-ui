import type { ActivityAction } from '../api/dashboard'

const stages = {
  held_for_dependency: {
    label: 'Held for IR move',
    description: 'This claim is waiting for its IR move to be verified before it can be sent.',
    color: 'blue',
  },
  dependency_verified: {
    label: 'Released after IR move',
    description: 'The IR move was verified and this claim was released to the worker.',
    color: 'teal',
  },
  dependency_failed: {
    label: 'Cancelled before submission',
    description: 'This claim was cancelled and was never sent to ESPN.',
    color: 'gray',
  },
}

const reasons: Record<string, string> = {
  parent_skipped: 'The IR move was skipped.',
  parent_rejected: 'The IR move was rejected.',
  parent_cancelled: 'The IR move was cancelled.',
  parent_expired: 'The IR move expired.',
  parent_failed_permanently: 'The IR move failed permanently.',
  parent_needs_manual_verification: 'The IR move needs manual verification.',
  parent_missing: 'The IR move could not be found.',
  hold_expired: 'The wait for the IR move expired.',
}

export function dependencyEvent(event: NonNullable<ActivityAction['events']>[number]) {
  if (!Object.hasOwn(stages, event.stage)) return null
  const stage = event.stage as keyof typeof stages
  const reason = event.detail.reason
  return {
    ...stages[stage],
    stage,
    parentId: typeof event.detail.depends_on === 'string' ? event.detail.depends_on : null,
    reason: typeof reason === 'string' ? reasons[reason] ?? `Reason: ${reason.replaceAll('_', ' ')}.` : null,
  }
}

export function actionDependency(action: ActivityAction) {
  for (const event of [...(action.events ?? [])].reverse()) {
    const dependency = dependencyEvent(event)
    if (dependency) return dependency
  }
  return null
}

export function isHeldAction(action: ActivityAction) {
  return action.execution === 'queued' && action.outcome === 'unknown'
    && actionDependency(action)?.stage === 'held_for_dependency'
}
