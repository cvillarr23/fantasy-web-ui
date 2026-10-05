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

beforeEach(() => queryClient.setDefaultOptions({ queries: { retry: false } }))
