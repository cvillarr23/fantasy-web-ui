import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import config from '../../vite.config'

const proxy = (config as { server: { proxy: Record<string, { headers?: Record<string, string> }> } }).server.proxy
const template = readFileSync('nginx.conf.template', 'utf8')

/** The dev-proxy entries that add the trigger key. */
const keyedPatterns = () => Object.keys(proxy).filter((pattern) => proxy[pattern].headers && 'X-API-Key' in proxy[pattern].headers)
const keyed = (path: string) => keyedPatterns().some((pattern) => new RegExp(pattern).test(path))

/** The body of the nginx location whose regex starts with ``prefix`` and contains ``route``. */
function nginxBlock(prefix: string, route: string) {
  const block = template.split(`location ~ ^${prefix}`).map((part) => part.split('\n    }')[0]).find((part) => part.includes(route))
  if (!block) throw new Error(`no nginx block for ${prefix}${route}`)
  return block
}

describe('job write routes', () => {
  it('get the key in the dev proxy, and no other jobs or runs path does', () => {
    for (const path of ['/v1/jobs/trade-scan/runs', '/v1/runs/run-1/cancel', '/v1/jobs/trade-scan/pause'])
      expect(keyed(path)).toBe(true)
    for (const path of ['/v1/jobs', '/v1/jobs/trade-scan/runs/extra', '/v1/runs/run-1', '/v1/runs/run-1/cancel/extra', '/v1/jobs/trade-scan/pause/extra'])
      expect(keyed(path)).toBe(false)
  })

  it.each([
    ['/v1/jobs/', '[^/]+/runs$', 'limit_except POST { deny all; }'],
    ['/v1/runs/', '[^/]+/cancel$', 'limit_except POST { deny all; }'],
    ['/v1/jobs/', '[^/]+/pause$', 'limit_except PUT DELETE { deny all; }'],
  ])('production proxy limits %s%s by method and translates backend authentication failure', (prefix, route, methods) => {
    const block = nginxBlock(prefix, route)
    expect(block).toContain(methods)
    expect(block).toContain('proxy_set_header X-API-Key "${TRIGGER_API_KEY}"')
    expect(block).toContain('error_page 401 = @jobs_auth_error')
  })

  it('has the shared authentication failure location', () => {
    expect(template).toContain('location @jobs_auth_error')
  })
})

it('serves the Grafana address as runtime config', () => {
  const block = template.split('location = /ui-config.json')[1].split('\n    }')[0]
  expect(block).toContain('default_type application/json')
  expect(block).toContain('"grafana_url":"${GRAFANA_URL}"')
})

it('defaults GRAFANA_URL so an unset variable cannot stop nginx starting', () => {
  expect(readFileSync('Dockerfile', 'utf8')).toMatch(/^ENV GRAFANA_URL=/m)
})
