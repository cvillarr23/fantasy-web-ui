import dagre from '@dagrejs/dagre'
import type { ChainInfo } from '../../api/jobs'

export const NODE_WIDTH = 176
export const NODE_HEIGHT = 136
const RANK_GAP = 72
const NODE_GAP = 24

export interface ChainLayoutNode {
  id: string
  position: { x: number; y: number }
}
export interface ChainLayoutEdge {
  id: string
  source: string
  target: string
  label: string
  /** The target runs once the source finishes, whatever the result. */
  finish: boolean
}
export interface ChainLayout {
  nodes: ChainLayoutNode[]
  edges: ChainLayoutEdge[]
  width: number
  height: number
}

function chainEdges(chain: ChainInfo): ChainLayoutEdge[] {
  return Object.entries(chain.steps).flatMap(([target, step]) =>
    step.after.map((dep) => ({
      id: `${dep.step}->${target}`,
      source: dep.step,
      target,
      label: dep.on,
      finish: dep.on === 'finish',
    })),
  )
}

function positionedGraph(chain: ChainInfo, edges: ChainLayoutEdge[]) {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'LR', ranksep: RANK_GAP, nodesep: NODE_GAP, marginx: 0, marginy: 0 })
  graph.setDefaultEdgeLabel(() => ({}))
  for (const step of Object.keys(chain.steps)) graph.setNode(step, { width: NODE_WIDTH, height: NODE_HEIGHT })
  for (const edge of edges) graph.setEdge(edge.source, edge.target)
  dagre.layout(graph)
  return graph
}

/** Left-to-right positions for a chain's steps. Dagre gives node centres; React Flow wants
 * top-left corners. */
export function chainLayout(chain: ChainInfo): ChainLayout {
  const edges = chainEdges(chain)
  const graph = positionedGraph(chain, edges)
  const nodes = graph.nodes().map((id) => {
    const { x, y } = graph.node(id)
    return { id, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } }
  })
  const { width = 0, height = 0 } = graph.graph()
  return { nodes, edges, width, height }
}
