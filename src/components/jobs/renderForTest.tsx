import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../../api/queryClient'

/** Renders inside the providers every Jobs component expects. They wrap a rerender too. */
export function renderForTest(ui: ReactElement, route = '/jobs') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  )
  return render(ui, { wrapper })
}
