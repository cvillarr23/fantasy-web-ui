import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { ByeBadge } from './ByeBadge'
import { byeBadgeState } from './byeBadgeState'

afterEach(cleanup)

it('tells this week, upcoming and past byes apart', () => {
  expect(byeBadgeState(7, 7)).toBe('this_week')
  expect(byeBadgeState(9, 7)).toBe('upcoming')
  expect(byeBadgeState(5, 7)).toBeNull()
  expect(byeBadgeState(null, 7)).toBeNull()
  expect(byeBadgeState(9, undefined)).toBe('upcoming')
})

it('shows BYE in the bye week and the week number before it', () => {
  const { rerender } = render(<MantineProvider><ByeBadge byeWeek={7} week={7} /></MantineProvider>)
  expect(screen.getByText('BYE')).toBeTruthy()
  rerender(<MantineProvider><ByeBadge byeWeek={9} week={7} /></MantineProvider>)
  expect(screen.getByText('Bye Wk 9')).toBeTruthy()
})
