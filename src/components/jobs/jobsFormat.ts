import type { ChainDependency, ChainInfo, JobCatalog, JobInfo, PauseInfo, RunParams } from '../../api/jobs'
import { isActiveRun } from '../runFormat'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const NOON = 12
const LOCALE = 'en-US'
const MS_PER_DAY = 86_400_000
const WEEKDAY_WINDOW_DAYS = 7
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

function hourParts(hour: number) {
  return { hour: hour % NOON || NOON, period: hour < NOON ? 'AM' : 'PM' }
}

function clock(hour: number, minute: number) {
  const { hour: shown, period } = hourParts(hour)
  return `${shown}:${String(minute).padStart(2, '0')} ${period}`
}

function roundHour(hour: number) {
  const { hour: shown, period } = hourParts(hour)
  return `${shown} ${period}`
}

function dayNames(field: string) {
  return field.split(',').map((day) => WEEKDAYS[Number(day) % WEEKDAYS.length]).join(', ')
}

const isDayList = (field: string) => /^\d(,\d)*$/.test(field)

/** Reads the cron shapes the catalog uses; returns null for any other. */
function readableCron(cron: string) {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cron.split(' ')
  if (dayOfMonth !== '*' || month !== '*') return null
  const days = isDayList(dayOfWeek) ? dayNames(dayOfWeek) : dayOfWeek === '*' ? '' : null
  if (days === null) return null
  const everyMinutes = /^\*\/(\d+)$/.exec(minute)
  if (everyMinutes && hour === '*') return `Every ${everyMinutes[1]} min${days && `, ${days}`}`
  const everyHours = /^(\d+)-(\d+)\/(\d+)$/.exec(hour)
  if (everyHours && minute === '0' && !days) {
    const [, start, end, step] = everyHours
    return `Every ${step} h, ${roundHour(Number(start))} to ${roundHour(Number(end))}`
  }
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    return `${days || 'Daily'} ${clock(Number(hour), Number(minute))}`
  }
  return null
}

function timeZoneSuffix(tz: string, viewerTz: string) {
  return tz === viewerTz ? '' : ` ${tz.split('/').pop()?.replaceAll('_', ' ')}`
}

/** A cron as words, with its timezone named when the viewer is in a different one. */
export function describeCron(cron: string, tz: string, viewerTz = browserTimeZone()) {
  const readable = readableCron(cron)
  return readable ? `${readable}${timeZoneSuffix(tz, viewerTz)}` : `Cron ${cron}`
}

/** The chain holding a step. Undefined for a step of several chains too, because the API
 * refuses a downstream run when it can't tell which chain is meant. */
export function chainForJob(job: string, chains: ChainInfo[]) {
  const holding = chains.filter((chain) => job in chain.steps)
  return holding.length === 1 ? holding[0] : undefined
}

/** Steps in dependency order, keeping catalog order among steps that are ready together. */
export function orderedSteps(chain: ChainInfo) {
  const remaining = Object.keys(chain.steps)
  const ordered: string[] = []
  while (remaining.length) {
    const ready = remaining.find((step) => chain.steps[step].after.every((dep) => ordered.includes(dep.step)))
    const next = ready ?? remaining[0]
    ordered.push(next)
    remaining.splice(remaining.indexOf(next), 1)
  }
  return ordered
}

/** ``step`` and every step that depends on it, in dependency order. */
export function stepsFrom(step: string, chain: ChainInfo) {
  const scope = new Set([step])
  const ordered = orderedSteps(chain)
  for (const candidate of ordered) {
    if (chain.steps[candidate].after.some((dep) => scope.has(dep.step))) scope.add(candidate)
  }
  return ordered.filter((candidate) => scope.has(candidate))
}

export const downstreamSteps = (step: string, chain: ChainInfo) => stepsFrom(step, chain).slice(1)

export function afterText(deps: ChainDependency[]) {
  return deps
    .map((dep) => `${dep.step} ${dep.on === 'success' ? 'succeeds' : 'finishes'}`)
    .join(' and ')
}

export function latestClock(latest: string) {
  const [hour, minute] = latest.split(':').map(Number)
  return clock(hour, minute)
}

interface ChainTrigger {
  /** The step has no schedule of its own: what starts it, and where it sits. */
  primary: string
  secondary: string
  /** The step also has its own schedule, so this goes beneath that schedule. */
  alongside: string
}

function chainTrigger(job: string, chain: ChainInfo, viewerTz: string): ChainTrigger {
  const step = chain.steps[job]
  if (!step.after.length) {
    const starts = `Starts ${chain.name}`
    const slot = chain.schedule ? describeCron(chain.schedule.cron, chain.schedule.tz, viewerTz) : 'Manual only'
    return { primary: slot, secondary: starts, alongside: starts }
  }
  const after = afterText(step.after)
  const by = step.latest ? `, by ${latestClock(step.latest)}` : ''
  return { primary: `After ${after}`, secondary: `In ${chain.name}${by}`, alongside: `Also after ${after}` }
}

/** What starts a job, as a main line and a smaller line beneath it. */
export function jobTrigger(job: JobInfo, chains: ChainInfo[], viewerTz = browserTimeZone()) {
  const [firstSchedule, ...otherSchedules] = job.schedules.map((s) => describeCron(s.cron, s.tz, viewerTz))
  const events = job.on_event.map((event) => `On ${event.key}`)
  const chain = chainForJob(job.name, chains)
  const inChain = chain && chainTrigger(job.name, chain, viewerTz)
  const primary = firstSchedule ?? inChain?.primary ?? events[0] ?? 'Manual only'
  const secondary = [
    ...otherSchedules.map((schedule) => `Also ${schedule}`),
    firstSchedule ? inChain?.alongside : inChain?.secondary,
    ...(firstSchedule || inChain ? events : events.slice(1)),
  ]
  return { primary, secondary: secondary.filter(Boolean).join(' · ') }
}

function calendarDaysBetween(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.round((end - start) / MS_PER_DAY)
}

const CLOCK = { hour: 'numeric', minute: '2-digit' } as const

/** The weekday when ``days`` is inside a week, else the full date. */
function dayStamp(moment: Date, days: number) {
  if (days > 0 && days < WEEKDAY_WINDOW_DAYS) return moment.toLocaleString(LOCALE, { weekday: 'short', ...CLOCK })
  return moment.toLocaleString(LOCALE, { weekday: 'short', month: 'short', day: 'numeric', ...CLOCK })
}

/** A coming slot in the viewer's time: only the time today, else the day. */
export function slotStamp(value: string, now = new Date()) {
  const slot = new Date(value)
  const days = calendarDaysBetween(now, slot)
  return days === 0 ? slot.toLocaleTimeString(LOCALE, CLOCK) : dayStamp(slot, days)
}

/** When a past run happened, in the viewer's time. */
export function runWhen(value: string, now = new Date()) {
  const run = new Date(value)
  const days = calendarDaysBetween(run, now)
  return days === 0 ? `Today ${run.toLocaleTimeString(LOCALE, CLOCK)}` : dayStamp(run, days)
}

export function pauseIsActive(pause: PauseInfo | null | undefined, now = new Date()) {
  if (!pause) return false
  return pause.paused_until === null || new Date(pause.paused_until) > now
}

function pausedSlot(pause: PauseInfo, now: Date) {
  const until = pause.paused_until ? `Paused until ${slotStamp(pause.paused_until, now)}` : 'Paused'
  return { label: until, note: pause.reason ?? '' }
}

/** When a job next runs. An active pause replaces a slot that wouldn't fire. */
export function jobNextSlot(job: JobInfo, chains: ChainInfo[], now = new Date()) {
  if (job.pause && pauseIsActive(job.pause, now)) return pausedSlot(job.pause, now)
  const chain = chainForJob(job.name, chains)
  if (job.next_run_at) {
    return { label: slotStamp(job.next_run_at, now), note: chain ? `Also with ${chain.name}` : '' }
  }
  if (chain?.next_run_at) return { label: slotStamp(chain.next_run_at, now), note: `With ${chain.name}` }
  return { label: '—', note: '' }
}

/** Every step of a run that can change the team: the job, plus later steps when included. */
export function actingSteps(job: JobInfo, downstream: boolean, catalog: JobCatalog) {
  const chain = downstream ? chainForJob(job.name, catalog.chains) : undefined
  const scope = chain ? stepsFrom(job.name, chain) : [job.name]
  return scope.filter((name) => catalog.jobs.find((candidate) => candidate.name === name)?.acts)
}

export type ParamKind = 'int' | 'float' | 'string' | 'bool'
export interface ParamField {
  name: string
  label: string
  kind: ParamKind
  required: boolean
}
export type ParamValues = Record<string, string | number | boolean | undefined>

const PARAM_KINDS: Record<string, ParamKind> = {
  int: 'int',
  integer: 'int',
  float: 'float',
  number: 'float',
  str: 'string',
  string: 'string',
  bool: 'bool',
  boolean: 'bool',
}

function paramLabel(name: string) {
  const words = name.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** The catalog's param allowlist as form fields. */
export function paramFields(params: Record<string, string>): ParamField[] {
  return Object.entries(params).map(([name, type]) => ({
    name,
    label: paramLabel(name),
    kind: PARAM_KINDS[type.replace(/\?$/, '')] ?? 'string',
    required: !type.endsWith('?'),
  }))
}

function isBlank(field: ParamField, value: ParamValues[string]) {
  if (field.kind === 'bool') return !field.required && !value
  return value === undefined || String(value).trim() === ''
}

/** The form's values to send, leaving out optional params left blank. */
export function buildRunParams(fields: ParamField[], values: ParamValues): RunParams {
  const entries = fields
    .filter((field) => !isBlank(field, values[field.name]))
    .map((field) => [field.name, values[field.name] ?? false])
  return Object.fromEntries(entries)
}

/** Labels of required params the form still needs. */
export function missingParams(fields: ParamField[], values: ParamValues) {
  return fields.filter((field) => field.required && isBlank(field, values[field.name])).map((field) => field.label)
}

/** Whether Run needs the rail: there's something to fill in, confirm or opt in to. */
export function opensRunForm(job: JobInfo, chains: ChainInfo[]) {
  return job.acts || Object.keys(job.params).length > 0 || Boolean(chainForJob(job.name, chains))
}

/** A one-at-a-time job with a queued or running run, which core would refuse. */
export function blockedByActiveRun(job: JobInfo) {
  return job.overlap === 'forbid' && isActiveRun(job.last_run?.status)
}

const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
// Matches the launcher heartbeat alert, so the page and ntfy agree on when it's stale.
const HEARTBEAT_STALE_SECONDS = 300

function ageText(seconds: number) {
  if (seconds < SECONDS_PER_MINUTE) return `${Math.round(seconds)}s ago`
  return `${Math.round(seconds / SECONDS_PER_MINUTE)}m ago`
}

export type LauncherTone = 'healthy' | 'warning' | 'unknown'

/** The header pill for launcher health. ``age`` is undefined until it has been read. */
export function launcherPill(age: number | undefined, failed: boolean): { label: string; tone: LauncherTone } {
  if (failed) return { label: 'Launcher status unavailable', tone: 'unknown' }
  if (age === undefined) return { label: 'Launcher …', tone: 'unknown' }
  if (age > HEARTBEAT_STALE_SECONDS) return { label: `Launcher quiet · heartbeat ${ageText(age)}`, tone: 'warning' }
  return { label: `Launcher healthy · heartbeat ${ageText(age)}`, tone: 'healthy' }
}

/** A length of time as "25 min" or "8 h". */
export function limitText(seconds: number) {
  const minutes = Math.round(seconds / SECONDS_PER_MINUTE)
  return minutes < MINUTES_PER_HOUR ? `${minutes} min` : `${Math.round(minutes / MINUTES_PER_HOUR)} h`
}

/** The catalog settings that shape a run, in words. */
export function jobFacts(job: JobInfo) {
  const attempts = `Up to ${job.max_attempts} ${job.max_attempts === 1 ? 'attempt' : 'attempts'}`
  const overlap = job.overlap === 'forbid' ? 'one run at a time' : 'overlapping runs wait'
  return `${attempts} · limit ${limitText(job.deadline_seconds)} · ${overlap}`
}

/** Params go to the first step only, so a dry run says nothing about the steps after it. */
export function confirmNote(job: JobInfo, params: RunParams, laterSteps: number) {
  if (laterSteps > 0 && Object.keys(job.params).length > 0) {
    return `Parameters apply to ${job.name} only. Later steps run for real.`
  }
  return params.dry_run ? 'Dry run is on, so this job reports what it would do without publishing it.' : ''
}

/** Links to a run from the Jobs page, so its back link returns here. */
export const JOBS_LINK_STATE = { from: 'jobs' }

export function runButtonState(job: JobInfo, chains: ChainInfo[], starting: boolean) {
  if (starting) return { label: 'Starting…', disabled: true }
  if (blockedByActiveRun(job)) return { label: 'Already running', disabled: true }
  return { label: opensRunForm(job, chains) ? 'Run…' : 'Run', disabled: false }
}
