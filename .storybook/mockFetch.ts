/** A small fetch stub for stories. Components call the real API client, which calls
 * fetch, so stubbing fetch exercises the same parsing and error handling the app uses. */
export interface MockRoute {
  /** Matched against the request path plus query string, such as `/v1/players/search?q=a`. */
  path: string | RegExp
  method?: string
  status?: number
  /** JSON response body, or a function of the request body. */
  body?: unknown
  /** Milliseconds before responding, or 'never' to keep the request pending. */
  delay?: number | 'never'
}

const realFetch = globalThis.fetch

export function mockFetch(routes: MockRoute[]) {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href)
    const target = url.pathname + url.search
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const route = routes.find(
      (r) =>
        (r.method ?? 'GET').toUpperCase() === method &&
        (typeof r.path === 'string' ? target === r.path || url.pathname === r.path : r.path.test(target)),
    )
    if (!route) return new Response(JSON.stringify({ detail: `No story mock for ${method} ${target}` }), { status: 404 })
    if (route.delay === 'never') return new Promise<Response>(() => {})
    if (route.delay) await new Promise((resolve) => setTimeout(resolve, route.delay as number))
    const body = typeof route.body === 'function' ? (route.body as (b: unknown) => unknown)(init?.body ? JSON.parse(String(init.body)) : undefined) : route.body
    return new Response(JSON.stringify(body ?? null), {
      status: route.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export function restoreFetch() {
  globalThis.fetch = realFetch
}
