import { queryClient } from './api/queryClient'
import { afterEach, beforeEach, vi } from 'vitest'
class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', TestResizeObserver)
// MantineProvider reads the color-scheme media query on mount; jsdom has no matchMedia.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
      matches: false, addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  })
}
Element.prototype.scrollIntoView = vi.fn()

afterEach(() => queryClient.clear())

// setDefaultOptions replaces the whole object, so keep the app's cache settings (staleTime,
// gcTime) and only turn retries off; tests then exercise the real caching behaviour.
const appDefaults = queryClient.getDefaultOptions()
beforeEach(() =>
  queryClient.setDefaultOptions({
    ...appDefaults,
    queries: { ...appDefaults.queries, retry: false },
  }),
)
