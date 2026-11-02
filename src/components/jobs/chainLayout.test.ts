import { describe, expect, it } from 'vitest'
import { chainFixture } from './fixtures'
import { chainLayout, NODE_HEIGHT, NODE_WIDTH } from './chainLayout'

describe('chainLayout', () => {
  const layout = chainLayout(chainFixture)
  const x = (step: string) => layout.nodes.find((n) => n.id === step)!.position.x

  it('places a node for every step', () => {
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(Object.keys(chainFixture.steps).sort())
  })

  it('runs left to right along the dependencies', () => {
    expect(x('sync-sample')).toBeLessThan(x('score-sample'))
    expect(x('set-lineup')).toBeLessThan(x('claim-waivers'))
  })

  it('draws one edge per dependency', () => {
    expect(layout.edges.map((e) => [e.source, e.target])).toEqual([
      ['sync-sample', 'score-sample'],
      ['score-sample', 'refresh-sample'],
      ['refresh-sample', 'set-lineup'],
      ['set-lineup', 'claim-waivers'],
    ])
  })

  it('labels each edge with what it waits for', () => {
    expect(layout.edges.map((e) => e.label)).toEqual(['success', 'finish', 'finish', 'finish'])
  })

  it('dashes only the edges that run whatever the result', () => {
    expect(layout.edges.map((e) => e.finish)).toEqual([false, true, true, true])
  })

  it('reports a size that holds every node', () => {
    expect(layout.width).toBeGreaterThanOrEqual(Math.max(...layout.nodes.map((n) => n.position.x)) + NODE_WIDTH)
    expect(layout.height).toBeGreaterThanOrEqual(NODE_HEIGHT)
  })

  it('stacks steps that share a parent', () => {
    const branching = {
      ...chainFixture,
      steps: {
        root: { after: [], latest: null },
        left: { after: [{ step: 'root', on: 'success' as const }], latest: null },
        right: { after: [{ step: 'root', on: 'success' as const }], latest: null },
      },
    }
    const nodes = chainLayout(branching).nodes
    const left = nodes.find((n) => n.id === 'left')!
    const right = nodes.find((n) => n.id === 'right')!
    expect(left.position.x).toBe(right.position.x)
    expect(Math.abs(left.position.y - right.position.y)).toBeGreaterThanOrEqual(NODE_HEIGHT)
  })
})
