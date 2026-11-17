import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { resourceSuggestionsFixture, runDetailFixture, runResourcesFixture } from './fixtures'
import { ResourceSuggestions } from './ResourceSuggestions'
import { RunUsage } from './RunUsage'
import { renderForTest } from './renderForTest'

afterEach(cleanup)

describe('ResourceSuggestions', () => {
  it('shows measured usage, the catalog values and the suggestion per job', () => {
    renderForTest(<ResourceSuggestions report={resourceSuggestionsFixture} />)
    expect(screen.getByText('CPU p95 120m · memory p95 98 MiB · max 98 MiB')).toBeTruthy()
    expect(screen.getAllByText('100m / 256Mi → 500m / 512Mi')).toHaveLength(2)
    expect(screen.getByText('120m / 128Mi → 400m / 160Mi')).toBeTruthy()
    expect(screen.getByText('Too few runs to suggest')).toBeTruthy()
  })
})

describe('RunUsage', () => {
  const finished = { ...runDetailFixture, status: 'success' as const, executor: 'pod' }

  it('shows usage against the container limits', () => {
    renderForTest(<RunUsage run={{ ...finished, summary: { resources: runResourcesFixture } }} />)
    expect(screen.getByText('2.50 CPU-s')).toBeTruthy()
    expect(screen.getByText('250m (50% of limit)')).toBeTruthy()
    expect(screen.getByText('128 MiB (50% of limit)')).toBeTruthy()
    expect(screen.getByText('0.25s held back by the CPU limit')).toBeTruthy()
  })

  it('says a finished launcher run recorded nothing', () => {
    renderForTest(<RunUsage run={{ ...finished, summary: {} }} />)
    expect(screen.getByText(/recorded no usage/)).toBeTruthy()
  })

  it('shows nothing for a run outside the launcher', () => {
    renderForTest(<RunUsage run={{ ...finished, executor: null, summary: {} }} />)
    expect(screen.queryByRole('heading', { name: 'Resources' })).toBeNull()
  })
})
