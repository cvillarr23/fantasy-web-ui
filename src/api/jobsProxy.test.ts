import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import config from '../../vite.config'

const proxy = (config as { server: { proxy: Record<string, { headers?: Record<string, string> }> } }).server.proxy
const template = readFileSync('nginx.conf.template', 'utf8')

it('injects the key only for starting a run in the dev proxy', () => {
  const pattern = Object.keys(proxy).find((p) => p.includes('jobs'))!
  expect(proxy[pattern].headers).toHaveProperty('X-API-Key')
  expect(new RegExp(pattern).test('/v1/jobs/trade-scan/runs')).toBe(true)
  for (const path of ['/v1/jobs', '/v1/jobs/trade-scan/pause', '/v1/jobs/trade-scan/runs/extra', '/v1/runs/1/cancel'])
    expect(new RegExp(pattern).test(path)).toBe(false)
})

it('production proxy limits the run route to POST and translates backend authentication failure', () => {
  const block = template.split('location ~ ^/v1/jobs/')[1].split('\n    }')[0]
  expect(block).toContain('[^/]+/runs$')
  expect(block).toContain('limit_except POST { deny all; }')
  expect(block).toContain('proxy_set_header X-API-Key "${TRIGGER_API_KEY}"')
  expect(block).toContain('error_page 401 = @jobs_auth_error')
  expect(template).toContain('location @jobs_auth_error')
})

it('leaves cancel and pause without the key', () => {
  expect(template).not.toMatch(/\/v1\/runs\/.*cancel/)
  expect(template).not.toMatch(/location[^\n]*\/pause/)
})

it('serves the Grafana address as runtime config', () => {
  const block = template.split('location = /ui-config.json')[1].split('\n    }')[0]
  expect(block).toContain('default_type application/json')
  expect(block).toContain('"grafana_url":"${GRAFANA_URL}"')
})

it('defaults GRAFANA_URL so an unset variable cannot stop nginx starting', () => {
  expect(readFileSync('Dockerfile', 'utf8')).toMatch(/^ENV GRAFANA_URL=/m)
})
