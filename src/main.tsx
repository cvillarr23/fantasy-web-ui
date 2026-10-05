import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import '@mantine/charts/styles.css'
import '@mantine/nprogress/styles.css'
import './index.css'
import App from './App.tsx'
import { theme, cssVariablesResolver } from './theme'
import { GlobalProgress } from './components/GlobalProgress'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider
      forceColorScheme="dark"
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
    >
      <QueryClientProvider client={queryClient}>
        <GlobalProgress />
        <App />
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
)
