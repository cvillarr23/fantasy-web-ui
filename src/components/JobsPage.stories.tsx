import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { mockFetch, type MockRoute } from '../../.storybook/mockFetch'
import { queryClient } from '../api/queryClient'
import { JOB_CATALOG_KEY } from '../hooks/jobQueries'
import { JobsPage } from './JobsPage'
import { catalogFixture, chainRootFixture, healthFixture } from './jobs/fixtures'

const chainRoutes: MockRoute[] = [
  { path: /^\/v1\/activity\/runs\?job=sample-weekly/, body: { items: [chainRootFixture] } },
  { path: /^\/v1\/activity\/runs\?job=/, body: { items: [] } },
  { path: '/v1/activity/runs/root-1', body: chainRootFixture },
]

function mockJobs(catalog: Partial<MockRoute>, extra: MockRoute[] = []) {
  mockFetch([
    ...extra,
    { path: '/v1/jobs', ...catalog },
    { path: '/v1/launcher/health', body: healthFixture },
    ...chainRoutes,
  ])
}

const meta = {
  title: 'Pages/Jobs',
  component: JobsPage,
  parameters: { route: '/jobs', layout: 'fullscreen' },
  beforeEach: () => mockJobs({ body: catalogFixture }),
} satisfies Meta<typeof JobsPage>
export default meta
type Story = StoryObj<typeof meta>

const page = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body)

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Jobs' })).toBeVisible()
    await expect(await canvas.findByRole('link', { name: '8 jobs' })).toBeVisible()
    await expect(await canvas.findByText('Launcher healthy · heartbeat 12s ago')).toBeVisible()
    await expect(await canvas.findByText('Running · step 2 of 5')).toBeVisible()
    await expect(await canvas.findByRole('heading', { level: 2, name: 'sample-weekly' })).toBeVisible()
  },
}

/** A job with params and a confirm step, selected from its row. */
export const SelectedJob: Story = {
  parameters: { route: '/jobs?job=set-lineup' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 3, name: 'set-lineup' })).toBeVisible()
    await expect(canvas.getByRole('textbox', { name: 'Week (optional)' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Review and run' })).toBeEnabled()
  },
}

/** A quiet first step whose downstream run reaches jobs that change the team. */
export const ConfirmDownstream: Story = {
  parameters: { route: '/jobs?job=sync-sample' },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('checkbox', { name: 'With downstream' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Review and run' }))
    const dialog = await page(canvasElement).findByRole('dialog')
    await expect(within(dialog).getByText("This job doesn't change your team, but later steps can.")).toBeVisible()
    await expect(within(dialog).getByRole('button', { name: 'Start run' })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('checkbox'))
    await expect(within(dialog).getByRole('button', { name: 'Start run' })).toBeEnabled()
  },
}

/** Core refuses because another run got there first. */
export const Refused: Story = {
  beforeEach: () =>
    mockJobs({ body: catalogFixture }, [
      { path: '/v1/jobs/sync-rumors/runs', method: 'POST', status: 409, body: { detail: "A run for 'sync-rumors' is already running" } },
    ]),
  play: async ({ canvas }) => {
    const row = (await canvas.findByRole('button', { name: 'sync-rumors' })).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Run' }))
    await expect(await canvas.findByText(/sync-rumors already has a run in progress/)).toBeVisible()
  },
}

/** A run the launcher accepted. */
export const Queued: Story = {
  beforeEach: () =>
    mockJobs({ body: catalogFixture }, [
      { path: '/v1/jobs/sync-rumors/runs', method: 'POST', status: 202, body: { run_id: 'run-9', status: 'queued' } },
    ]),
  play: async ({ canvas }) => {
    const row = (await canvas.findByRole('button', { name: 'sync-rumors' })).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Run' }))
    await expect(await canvas.findByRole('link', { name: 'Watch this run' })).toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: () => mockJobs({ delay: 'never' }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status', { name: 'Loading jobs' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: '… jobs' })).toBeVisible()
  },
}

export const Error: Story = {
  beforeEach: () => mockJobs({ status: 500, body: { detail: 'Launcher catalog read failed' } }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'jobs unavailable' })).toBeVisible()
  },
}

export const Empty: Story = {
  beforeEach: () => mockJobs({ body: { jobs: [], chains: [] } }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/No jobs in the catalog/)).toBeVisible()
  },
}

/** The cached catalog stays on screen, dimmed, under an error when a refresh fails. */
export const Stale: Story = {
  beforeEach: () => {
    mockJobs({ status: 500, body: { detail: 'Gateway timed out' } })
    queryClient.setQueryData(JOB_CATALOG_KEY, catalogFixture, { updatedAt: 1 })
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Could not refresh jobs/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'sync-rumors' })).toBeVisible()
  },
}

export const Phone: Story = {
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvasElement, canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'sync-rumors' })).toBeVisible()
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}
