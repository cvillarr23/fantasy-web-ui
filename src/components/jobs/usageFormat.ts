import type { RunResources } from '../../api/runs'

const MIB = 1024 * 1024
const GIB = 1024 * MIB
const PERCENT = 100

/** A run's recorded usage, or null when it recorded none (still running, killed, or older). */
export function runResources(summary: Record<string, unknown> | undefined): RunResources | null {
  const value = summary?.resources
  if (!value || typeof value !== 'object') return null
  const resources = value as RunResources
  return typeof resources.cpu_seconds === 'number' ? resources : null
}

/** "98 MiB", "1.2 GiB". */
export function formatBytes(bytes: number) {
  return bytes >= GIB ? `${(bytes / GIB).toFixed(1)} GiB` : `${Math.round(bytes / MIB)} MiB`
}

/** "0.42 CPU-s", "12 CPU-s". */
export function formatCpuSeconds(seconds: number) {
  return `${seconds < 10 ? seconds.toFixed(2) : Math.round(seconds)} CPU-s`
}

/** Cores as millicores, the unit the catalog's resources use: "120m". */
export function formatCores(cores: number) {
  return `${Math.round(cores * 1000)}m`
}

/** Average cores over the run's wall time. */
export function averageCores(resources: RunResources) {
  return resources.wall_seconds > 0 ? resources.cpu_seconds / resources.wall_seconds : 0
}

/** "62%" of a limit, or empty when the run had no limit. */
export function shareOf(value: number, limit: number | null | undefined) {
  return limit ? `${Math.round((value / limit) * PERCENT)}%` : ''
}

/** "1.2 CPU-s · 98 MiB peak", for a compact run row. */
export function usageNote(resources: RunResources) {
  return `${formatCpuSeconds(resources.cpu_seconds)} · ${formatBytes(resources.peak_memory_bytes)} peak`
}
