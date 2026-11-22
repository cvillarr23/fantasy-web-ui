import type { QueryClient } from '@tanstack/react-query'

export const JOB_CATALOG_KEY = ['jobs-catalog']
export const CHAIN_RUN_KEY = 'chain-run'
export const JOB_RUNS_KEY = 'job-runs'
export const RESOURCE_SUGGESTIONS_KEY = ['resource-suggestions']
export const WAITING_APPROVALS_KEY = ['waiting-approvals']

/** Refetches what an approval decision changes: the job views, the run lists and details, and the waiting count. */
export const refreshApprovalViews = (client: QueryClient) =>
  Promise.all([
    refreshJobViews(client),
    client.invalidateQueries({ queryKey: WAITING_APPROVALS_KEY }),
    client.invalidateQueries({ queryKey: ['runs'] }),
    client.invalidateQueries({ queryKey: ['run'] }),
  ])

/** Refetches every view of a job's runs and settings after something changed them. */
export const refreshJobViews = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: JOB_CATALOG_KEY }),
    client.invalidateQueries({ queryKey: [JOB_RUNS_KEY] }),
    client.invalidateQueries({ queryKey: [CHAIN_RUN_KEY] }),
  ])
