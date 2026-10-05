import { queryClient } from './api/queryClient'
import { afterEach, beforeEach, vi } from 'vitest'
class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', TestResizeObserver)
Element.prototype.scrollIntoView = vi.fn()

afterEach(() => queryClient.clear())

beforeEach(() => queryClient.setDefaultOptions({ queries: { retry: false } }))
