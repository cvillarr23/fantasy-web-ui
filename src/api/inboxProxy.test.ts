import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import config from '../../vite.config'
it('injects the key only for the four inbox mutation paths in the dev proxy', () => {
  const proxy = (
    config as {
      server: { proxy: Record<string, { headers?: Record<string, string> }> }
    }
  ).server.proxy
  const pattern = Object.keys(proxy).find((p) => p.includes('incoming'))!
  expect(proxy[pattern].headers).toHaveProperty('X-API-Key')
  for (const action of ['triage', 'decision', 'decision/retry', 'counter'])
    expect(new RegExp(pattern).test(`/v1/trade/incoming/123/${action}`)).toBe(true)
  for (const path of [
    '/v1/trade/incoming',
    '/v1/trade/incoming/123/decision-extra',
    '/v1/trade/incoming/123/other',
    '/v1/trade/incoming/123/decision/extra',
    '/v1/trade/incoming/123/decision/retry/extra',
    '/v1/trade/incoming/123/triage/retry',
  ])
    expect(new RegExp(pattern).test(path)).toBe(false)
  expect(proxy['/v1'].headers).toBeUndefined()
})
it('production proxy limits mutation routes to POST and translates backend authentication failure', () => {
  const template = readFileSync('nginx.conf.template', 'utf8')
  const block = template.split('location ~ ^/v1/trade/incoming/')[1].split('\n    }')[0]
  expect(block).toContain('(triage|decision|decision/retry|counter)$')
  expect(block).toContain('limit_except POST { deny all; }')
  expect(block).toContain('proxy_set_header X-API-Key "${TRIGGER_API_KEY}"')
  expect(block).toContain('error_page 401 = @inbox_auth_error')
})
