import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { StrengthChip } from './StrengthChip'

afterEach(cleanup)

it.each([
  [0.42, 'Strength ▲ +0.42 average'],
  [-0.42, 'Strength ▼ -0.42 average'],
  [0.496, 'Strength ▲ +0.50 strong'],
  [-0.496, 'Strength ▼ -0.50 weak'],
  [0.494, 'Strength ▲ +0.49 average'],
  [-0.494, 'Strength ▼ -0.49 average'],
  [0.01, 'Strength ▲ +0.01 average'],
  [-0.01, 'Strength ▼ -0.01 average'],
  [0, 'Strength 0.00 average'],
  [null, 'Strength unknown'],
])('labels displayed strength %s consistently', (value, label) => {
  render(<MantineProvider><StrengthChip value={value} /></MantineProvider>)
  expect(screen.getByText(label)).toBeTruthy()
})

it('leaves repeated table values out of the tab order by default', () => {
  render(<MantineProvider><StrengthChip value={0.42} /></MantineProvider>)
  expect(screen.queryByRole('button')).toBeNull()
})

it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY])('keeps missing strength %s unknown', (value) => {
  render(<MantineProvider><StrengthChip value={value} /></MantineProvider>)
  expect(screen.getByText('Strength unknown')).toBeTruthy()
})
