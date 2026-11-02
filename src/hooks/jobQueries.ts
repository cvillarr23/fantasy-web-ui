import type { QueryClient } from '@tanstack/react-query'

export const JOB_CATALOG_KEY = ['jobs-catalog']
export const CHAIN_RUN_KEY = 'chain-run'
export const JOB_RUNS_KEY = 'job-runs'

/** Refetches every view of a job's runs and settings after something changed them. */
export const refreshJobViews = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: JOB_CATALOG_KEY }),
    client.invalidateQueries({ queryKey: [JOB_RUNS_KEY] }),
    client.invalidateQueries({ queryKey: [CHAIN_RUN_KEY] }),
  ])
