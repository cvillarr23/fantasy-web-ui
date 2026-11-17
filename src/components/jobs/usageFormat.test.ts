import { describe, expect, it } from 'vitest'
import { averageCores, formatBytes, formatCores, formatCpuSeconds, runResources, shareOf, usageNote } from './usageFormat'

const resources = {
  source: 'cgroup' as const,
  cpu_seconds: 2.5,
  peak_memory_bytes: 98 * 1024 * 1024,
  wall_seconds: 5,
  attempt: 1,
  limits: { cpu_cores: 0.5, memory_bytes: 256 * 1024 * 1024 },
}

describe('usageFormat', () => {
  it('reads recorded usage and ignores anything else', () => {
    expect(runResources({ resources })).toBe(resources)
    expect(runResources({ resources: { unavailable: 'no_samples' } })).toBeNull()
    expect(runResources({})).toBeNull()
    expect(runResources(undefined)).toBeNull()
  })

  it('formats CPU, memory and cores', () => {
    expect(formatCpuSeconds(0.4213)).toBe('0.42 CPU-s')
    expect(formatCpuSeconds(12.4)).toBe('12 CPU-s')
    expect(formatBytes(98 * 1024 * 1024)).toBe('98 MiB')
    expect(formatBytes(1.25 * 1024 ** 3)).toBe('1.3 GiB')
    expect(formatCores(0.123)).toBe('123m')
  })

  it('derives average cores and a share of a limit', () => {
    expect(averageCores(resources)).toBe(0.5)
    expect(averageCores({ ...resources, wall_seconds: 0 })).toBe(0)
    expect(shareOf(64, 256)).toBe('25%')
    expect(shareOf(64, null)).toBe('')
  })

  it('summarizes a run in one line', () => {
    expect(usageNote(resources)).toBe('2.50 CPU-s · 98 MiB peak')
  })
})
