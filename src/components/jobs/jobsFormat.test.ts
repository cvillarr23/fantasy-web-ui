import { describe, expect, it } from 'vitest'
import { catalogFixture, chainFixture, jobFixture } from './fixtures'
import {
  actingSteps,
  buildRunParams,
  chainForJob,
  describeCron,
  downstreamSteps,
  jobFacts,
  jobNextSlot,
  jobTrigger,
  launcherPill,
  missingParams,
  opensRunForm,
  paramFields,
  pauseIsActive,
  runButtonState,
  runWhen,
  slotStamp,
} from './jobsFormat'

const job = (name: string) => catalogFixture.jobs.find((j) => j.name === name)!
const chains = catalogFixture.chains

describe('describeCron', () => {
  it.each([
    ['*/30 * * * *', 'Every 30 min'],
    ['*/10 * * * 4,0,1', 'Every 10 min, Thu, Sun, Mon'],
    ['0 11 * * *', 'Daily 11:00 AM'],
    ['45 21 * * *', 'Daily 9:45 PM'],
    ['0 13 * * 3,5', 'Wed, Fri 1:00 PM'],
    ['30 12 * * 3,5', 'Wed, Fri 12:30 PM'],
    ['0 8-22/2 * * *', 'Every 2 h, 8 AM to 10 PM'],
    ['0 0 * * 1', 'Mon 12:00 AM'],
  ])('reads %s as %s', (cron, expected) => {
    expect(describeCron(cron, 'America/Chicago', 'America/Chicago')).toBe(expected)
  })

  it('shows a cron it cannot read as written', () => {
    expect(describeCron('0 0 1 * *', 'America/Chicago', 'America/Chicago')).toBe('Cron 0 0 1 * *')
  })

  it('names the timezone when it differs from the viewer', () => {
    expect(describeCron('0 6 * * 1', 'UTC', 'America/Chicago')).toBe('Mon 6:00 AM UTC')
  })
})

describe('jobTrigger', () => {
  const viewer = 'America/Chicago'

  it('shows a plain schedule alone', () => {
    expect(jobTrigger(job('sync-rumors'), chains, viewer)).toEqual({ primary: 'Every 30 min', secondary: '' })
  })

  it('shows the chain slot for a first step', () => {
    expect(jobTrigger(job('sync-sample'), chains, viewer)).toEqual({
      primary: 'Tue 4:00 PM',
      secondary: 'Starts sample-weekly',
    })
  })

  it('names the parent step and the latest start for a chain-only step', () => {
    expect(jobTrigger(job('set-lineup'), chains, viewer)).toEqual({
      primary: 'After refresh-sample finishes',
      secondary: 'In sample-weekly, by 7:15 PM',
    })
  })

  it('shows a schedule first and the chain edge beneath it', () => {
    expect(jobTrigger(job('score-sample'), chains, viewer)).toEqual({
      primary: 'Fri 10:00 AM',
      secondary: 'Also after sync-sample succeeds',
    })
  })

  it('lists further schedules', () => {
    const twice = jobFixture({
      name: 'twice',
      schedules: [
        { cron: '0 7 * * *', tz: viewer },
        { cron: '30 12 * * 3,5', tz: viewer },
      ],
    })
    expect(jobTrigger(twice, [], viewer)).toEqual({ primary: 'Daily 7:00 AM', secondary: 'Also Wed, Fri 12:30 PM' })
  })

  it('names an event trigger', () => {
    const onEvent = jobFixture({ name: 'reacts', on_event: [{ key: 'rumor.signal_created' }] })
    expect(jobTrigger(onEvent, [], viewer)).toEqual({ primary: 'On rumor.signal_created', secondary: '' })
  })

  it('says manual only when nothing starts the job', () => {
    expect(jobTrigger(jobFixture({ name: 'alone' }), [], viewer)).toEqual({ primary: 'Manual only', secondary: '' })
  })
})

describe('slotStamp', () => {
  const now = new Date(2026, 10, 3, 16, 22)

  it('drops the day for today', () => {
    expect(slotStamp(new Date(2026, 10, 3, 16, 30).toISOString(), now)).toBe('4:30 PM')
  })

  it('uses the weekday inside the next week', () => {
    expect(slotStamp(new Date(2026, 10, 4, 18, 0).toISOString(), now)).toBe('Wed 6:00 PM')
  })

  it('uses the date further out', () => {
    expect(slotStamp(new Date(2026, 10, 10, 16, 0).toISOString(), now)).toBe('Tue, Nov 10, 4:00 PM')
  })
})

describe('runWhen', () => {
  const now = new Date(2026, 10, 3, 16, 22)

  it('says today for a run earlier today', () => {
    expect(runWhen(new Date(2026, 10, 3, 7, 0).toISOString(), now)).toBe('Today 7:00 AM')
  })

  it('uses the weekday inside the last week', () => {
    expect(runWhen(new Date(2026, 10, 2, 0, 0).toISOString(), now)).toBe('Mon 12:00 AM')
  })

  it('uses the date further back', () => {
    expect(runWhen(new Date(2026, 9, 20, 16, 0).toISOString(), now)).toBe('Tue, Oct 20, 4:00 PM')
  })
})

describe('jobNextSlot', () => {
  const now = new Date('2026-11-03T22:22:00Z')

  it('uses the chain slot for a chain-only step', () => {
    expect(jobNextSlot(job('set-lineup'), chains, now).note).toBe('With sample-weekly')
  })

  it('shows a dash when there is no slot', () => {
    expect(jobNextSlot(jobFixture({ name: 'alone' }), [], now)).toEqual({ label: '—', note: '' })
  })

  it('shows a dash for an old API that sends no next_run_at', () => {
    const { next_run_at: _unused, ...old } = job('sync-rumors')
    expect(jobNextSlot(old, [], now).label).toBe('—')
  })

  it('replaces the slot with an active pause', () => {
    const paused = jobFixture({
      name: 'paused',
      next_run_at: '2026-11-04T00:00:00Z',
      pause: { name: 'paused', paused_until: '2026-11-08T15:00:00Z', reason: 'Bye week', set_at: '2026-11-03T00:00:00Z' },
    })
    const slot = jobNextSlot(paused, [], now)
    expect(slot.label).toMatch(/^Paused until /)
    expect(slot.note).toBe('Bye week')
  })

  it('ignores a pause that has run out', () => {
    const lapsed = jobFixture({
      name: 'lapsed',
      next_run_at: '2026-11-04T00:00:00Z',
      pause: { name: 'lapsed', paused_until: '2026-11-01T00:00:00Z', set_at: '2026-10-30T00:00:00Z' },
    })
    expect(jobNextSlot(lapsed, [], now).label).not.toMatch(/Paused/)
  })
})

describe('pauseIsActive', () => {
  const now = new Date('2026-11-03T00:00:00Z')

  it('treats no end time as active', () => {
    expect(pauseIsActive({ name: 'x', paused_until: null, set_at: '' }, now)).toBe(true)
  })

  it('treats no pause as inactive', () => {
    expect(pauseIsActive(null, now)).toBe(false)
  })
})

describe('chain membership', () => {
  it('finds the chain a job belongs to', () => {
    expect(chainForJob('set-lineup', chains)?.name).toBe('sample-weekly')
  })

  it('finds nothing for a job outside any chain', () => {
    expect(chainForJob('sync-rumors', chains)).toBeUndefined()
  })

  it('offers no chain when a job sits in two, because the API refuses downstream then', () => {
    expect(chainForJob('set-lineup', [chainFixture, { ...chainFixture, name: 'other' }])).toBeUndefined()
  })

  it('lists only the steps after the chosen one', () => {
    expect(downstreamSteps('refresh-sample', chainFixture)).toEqual(['set-lineup', 'claim-waivers'])
  })

  it('lists nothing after the last step', () => {
    expect(downstreamSteps('claim-waivers', chainFixture)).toEqual([])
  })
})

describe('actingSteps', () => {
  it('is empty for a job that does not act', () => {
    expect(actingSteps(job('sync-sample'), false, catalogFixture)).toEqual([])
  })

  it('includes the job itself', () => {
    expect(actingSteps(job('set-lineup'), false, catalogFixture)).toEqual(['set-lineup'])
  })

  it('finds later steps that act when a quiet job runs with downstream', () => {
    expect(actingSteps(job('sync-sample'), true, catalogFixture)).toEqual(['set-lineup', 'claim-waivers'])
  })
})

describe('params', () => {
  it('reads the catalog allowlist', () => {
    expect(paramFields({ week: 'int?', dry_run: 'bool?', label: 'string', ratio: 'number' })).toEqual([
      { name: 'week', label: 'Week', kind: 'int', required: false },
      { name: 'dry_run', label: 'Dry run', kind: 'bool', required: false },
      { name: 'label', label: 'Label', kind: 'string', required: true },
      { name: 'ratio', label: 'Ratio', kind: 'float', required: true },
    ])
  })

  it('leaves blank optional params out', () => {
    expect(buildRunParams(paramFields({ week: 'int?', dry_run: 'bool?' }), { week: '', dry_run: false })).toEqual({})
  })

  it('sends typed values', () => {
    expect(buildRunParams(paramFields({ week: 'int?', dry_run: 'bool?' }), { week: 7, dry_run: true })).toEqual({
      week: 7,
      dry_run: true,
    })
  })

  it('names required params still blank', () => {
    expect(missingParams(paramFields({ label: 'string', week: 'int?' }), { label: '  ' })).toEqual(['Label'])
  })
})

describe('launcherPill', () => {
  it('reports a fresh heartbeat as healthy', () => {
    expect(launcherPill(12, false)).toEqual({ label: 'Launcher healthy · heartbeat 12s ago', tone: 'healthy' })
  })

  it('warns once the heartbeat is past the alert threshold', () => {
    expect(launcherPill(420, false)).toEqual({ label: 'Launcher quiet · heartbeat 7m ago', tone: 'warning' })
  })

  it('says when status could not be read', () => {
    expect(launcherPill(undefined, true)).toEqual({ label: 'Launcher status unavailable', tone: 'unknown' })
  })

  it('says while status is loading', () => {
    expect(launcherPill(undefined, false)).toEqual({ label: 'Launcher …', tone: 'unknown' })
  })
})

describe('jobFacts', () => {
  it('reads the catalog settings', () => {
    expect(jobFacts(jobFixture({ name: 'a', max_attempts: 3, deadline_seconds: 3600 }))).toBe('Up to 3 attempts · limit 1 h · one run at a time')
  })

  it('uses minutes under an hour, and the singular', () => {
    expect(jobFacts(jobFixture({ name: 'a', max_attempts: 1, deadline_seconds: 1500 }))).toBe('Up to 1 attempt · limit 25 min · one run at a time')
  })

  it('says when overlapping runs wait', () => {
    expect(jobFacts(jobFixture({ name: 'a', overlap: 'queue' }))).toContain('overlapping runs wait')
  })
})

describe('run button', () => {
  it('runs a plain job at once', () => {
    expect(opensRunForm(job('sync-rumors'), chains)).toBe(false)
    expect(runButtonState(job('sync-rumors'), chains, false)).toEqual({ label: 'Run', disabled: false })
  })

  it.each(['set-lineup', 'scan-trades', 'sync-sample'])('sends %s to the rail', (name) => {
    expect(runButtonState(job(name), chains, false)).toEqual({ label: 'Run…', disabled: false })
  })

  it('shows progress while starting', () => {
    expect(runButtonState(job('sync-rumors'), chains, true)).toEqual({ label: 'Starting…', disabled: true })
  })

  it('blocks a second run of a one-at-a-time job', () => {
    expect(runButtonState(job('score-sample'), chains, false)).toEqual({ label: 'Already running', disabled: true })
  })

  it('stays on when the job queues overlapping runs', () => {
    const queues = { ...job('score-sample'), overlap: 'queue' }
    expect(runButtonState(queues, chains, false).disabled).toBe(false)
  })
})
