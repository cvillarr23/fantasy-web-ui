export const AFFECTS_TEAM_HELP =
  'This job can change your team on ESPN or stage moves for your approval, so it always asks you to confirm first.'

export const CHAIN_EDGE_HELP =
  'A solid line waits for success. A dashed line runs once the step before it finishes, whatever the result.'

const JOB_EFFECTS: Record<string, string> = {
  'lineup-optimizer': 'Queues lineup swaps',
  'waiver-trigger': 'Queues waiver claims',
  'rumor-action-trigger': 'Queues roster moves from rumors',
  'trade-scan': 'Stages trade proposals for your approval',
}

export const jobEffect = (job: string) => JOB_EFFECTS[job] ?? 'Can change your team on ESPN'
