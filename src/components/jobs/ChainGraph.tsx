import { useMemo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import type { ChainInfo, JobInfo } from '../../api/jobs'
import { isActiveRun } from '../runFormat'
import { AffectsTeamBadge } from './AffectsTeamBadge'
import { CancelRunButton } from './CancelRunButton'
import { chainLayout, NODE_HEIGHT, NODE_WIDTH, type ChainLayoutEdge, type ChainLayoutNode } from './chainLayout'
import { stepStatusLabel, type ChainStepState } from './chainStatus'
import { pauseIsActive } from './jobsFormat'
import { PausedBadge } from './PausedBadge'
import { RunStatusText } from './RunStatusText'
import { stepNote } from './stepNote'

interface StepData extends Record<string, unknown> {
  state: ChainStepState
  note: string
  acts: boolean
  paused: boolean
  selected: boolean
  onSelect: (job: string) => void
}
type StepNode = Node<StepData, 'step'>
type StepEdge = Edge<{ label: string; finish: boolean }, 'step'>

interface Props {
  chain: ChainInfo
  jobs: JobInfo[]
  states: ChainStepState[]
  selected: string | null
  onSelect: (job: string) => void
}

function stepLabel({ state, note, acts, paused }: StepData) {
  return [state.step, stepStatusLabel(state.status), acts && 'affects team', paused && 'paused', note].filter(Boolean).join(', ')
}

/** A step is a button that selects it. A Cancel button for its active run sits beside it in
 * the same box, since one button can't hold another. */
function ChainStepNode({ data }: NodeProps<StepNode>) {
  const { state, note, acts, paused, selected, onSelect } = data
  const cancellable = Boolean(state.run && isActiveRun(state.run.status))
  const classes = ['chain-node', `chain-node-${state.status}`, selected && 'chain-node-selected', cancellable && 'chain-node-cancellable']
  return (
    <div className="chain-node-box">
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <button
        type="button"
        className={classes.filter(Boolean).join(' ')}
        aria-label={stepLabel(data)}
        onClick={() => onSelect(state.step)}
      >
        <span className="chain-node-title">
          <span className="chain-node-name">{state.step}</span>
          {acts && <AffectsTeamBadge />}
          {paused && <PausedBadge />}
        </span>
        <RunStatusText status={state.status} label={stepStatusLabel(state.status)} />
        <span className="chain-node-note">{note}</span>
      </button>
      {cancellable && state.run && (
        <CancelRunButton runId={state.run.id} job={state.step} className="chain-node-cancel" />
      )}
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
}

function ChainStepEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }: EdgeProps<StepEdge>) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} className={data?.finish ? 'chain-edge chain-edge-finish' : 'chain-edge'} />
      <EdgeLabelRenderer>
        <span className="chain-edge-label" style={{ transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 2}px)` }}>
          {data?.label}
        </span>
      </EdgeLabelRenderer>
    </>
  )
}

// Keeps the library's credit clear of the bottom row of steps.
const CREDIT_ROOM = 22
const NODE_TYPES = { step: ChainStepNode }
const EDGE_TYPES = { step: ChainStepEdge }

/** Handles and sizes are given up front, because React Flow would otherwise measure them
 * after mount and draw no edges until then. */
const STEP_HANDLES = [
  { id: null, type: 'target' as const, position: Position.Left, x: 0, y: NODE_HEIGHT / 2, width: 1, height: 1 },
  { id: null, type: 'source' as const, position: Position.Right, x: NODE_WIDTH, y: NODE_HEIGHT / 2, width: 1, height: 1 },
]

function stepNode(node: ChainLayoutNode, props: Props): StepNode {
  const state = props.states.find((candidate) => candidate.step === node.id) ?? { step: node.id, status: 'no_run' as const }
  const job = props.jobs.find((candidate) => candidate.name === node.id)
  return {
    id: node.id,
    type: 'step',
    position: node.position,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    measured: { width: NODE_WIDTH, height: NODE_HEIGHT },
    handles: STEP_HANDLES,
    data: {
      state,
      note: stepNote(state, props.chain.steps[node.id]),
      acts: Boolean(job?.acts),
      paused: pauseIsActive(job?.pause),
      selected: node.id === props.selected,
      onSelect: props.onSelect,
    },
  }
}

function stepEdge(edge: ChainLayoutEdge): StepEdge {
  return {
    id: edge.id,
    type: 'step',
    source: edge.source,
    target: edge.target,
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { label: edge.label, finish: edge.finish },
  }
}

/** A read-only picture of a chain. It stays at full size and scrolls inside its box,
 * because seven steps shrunk to fit would be too small to read. */
export function ChainGraph(props: Props) {
  const layout = useMemo(() => chainLayout(props.chain), [props.chain])
  const nodes = layout.nodes.map((node) => stepNode(node, props))
  const edges = layout.edges.map(stepEdge)
  return (
    <div className="chain-graph-scroll">
      <div className="chain-graph" style={{ width: layout.width, height: layout.height + CREDIT_ROOM }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={1}
          maxZoom={1}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
        />
      </div>
    </div>
  )
}
