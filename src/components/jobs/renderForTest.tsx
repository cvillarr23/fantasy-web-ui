import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../api/queryClient'

/** Renders inside the providers every Jobs component expects. */
export function renderForTest(ui: ReactElement, route = '/jobs') {
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  )
}
