import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { StatTile } from './StatTile'

afterEach(cleanup)

it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])('uses the shared missing-score label for %s', (value) => {
  render(<MantineProvider><StatTile label="Gain" value={value} /></MantineProvider>)
  expect(screen.getByText('Not available')).toBeTruthy()
})

it.each([0.001, -0.001, 0.04, -0.04])('normalizes a displayed zero for %s', (value) => {
  render(<MantineProvider><StatTile label="Gain" value={value} /></MantineProvider>)
  expect(screen.getByText('0.0')).toBeTruthy()
  expect(screen.queryByText(/^[+-]0\.0$/)).toBeNull()
})
