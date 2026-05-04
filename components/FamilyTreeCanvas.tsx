'use client'
import { useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  EdgeProps,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'
import PersonNode from './PersonNode'

// ── SpouseEdge ─────────────────────────────────────────────────────────────

function SpouseEdge({ sourceX, sourceY, targetX, targetY }: EdgeProps) {
  const dx   = Math.abs(targetX - sourceX)
  const lift = Math.max(90, dx * 0.28)
  const d    = `M ${sourceX},${sourceY} C ${sourceX},${sourceY - lift} ${targetX},${targetY - lift} ${targetX},${targetY}`
  return (
    <path
      d={d}
      fill="none"
      stroke="#f43f5e"
      strokeWidth={1.5}
      strokeDasharray="6 4"
      strokeLinecap="round"
    />
  )
}

// ── CoupleNode ─────────────────────────────────────────────────────────────

const COUPLE_SIZE = 10

function CoupleNode() {
  return (
    <div style={{ width: COUPLE_SIZE, height: COUPLE_SIZE, position: 'relative' }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#94a3b8', width: 6, height: 6, border: '2px solid white' }}
      />
      <div
        style={{
          width: COUPLE_SIZE,
          height: COUPLE_SIZE,
          borderRadius: '50%',
          background: '#94a3b8',
          border: '2px solid white',
          boxShadow: '0 0 0 2px #e2e8f0',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#94a3b8', width: 6, height: 6, border: '2px solid white' }}
      />
    </div>
  )
}

const nodeTypes = { person: PersonNode, couple: CoupleNode }
const edgeTypes = { spouseArc: SpouseEdge }

// ── constants ───────────────────────────────────────────────────────────────

const NODE_W = 230
const NODE_H = 90

// ── buildGraph ──────────────────────────────────────────────────────────────

function buildGraph(people: any[], relationships: any[]) {
  const spouseRels = relationships.filter((r) => r.type === 'spouse')
  const pcRels     = relationships.filter((r) => r.type === 'parent_child')

  const spouseOf = new Map<string, Set<string>>()
  for (const r of spouseRels) {
    for (const [a, b] of [[r.from_person_id, r.to_person_id], [r.to_person_id, r.from_person_id]] as [string, string][]) {
      if (!spouseOf.has(a)) spouseOf.set(a, new Set())
      spouseOf.get(a)!.add(b)
    }
  }

  const parentsOf = new Map<string, Set<string>>()
  for (const r of pcRels) {
    if (!parentsOf.has(r.to_person_id)) parentsOf.set(r.to_person_id, new Set())
    parentsOf.get(r.to_person_id)!.add(r.from_person_id)
  }

  const couplesWithChildren = new Map<string, { p1: string; p2: string }>()
  const childCoupleKey = new Map<string, string>()

  for (const [childId, pSet] of parentsOf) {
    const pArr = Array.from(pSet)
    let matched = false
    for (let i = 0; i < pArr.length && !matched; i++) {
      for (let j = i + 1; j < pArr.length && !matched; j++) {
        const [a, b] = [pArr[i], pArr[j]]
        if (spouseOf.get(a)?.has(b)) {
          const key = [a, b].sort().join('::')
          if (!couplesWithChildren.has(key)) couplesWithChildren.set(key, { p1: a, p2: b })
          childCoupleKey.set(childId, key)
          matched = true
        }
      }
    }
  }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 90 })

  for (const p of people) g.setNode(p.id, { width: NODE_W, height: NODE_H })

  for (const key of couplesWithChildren.keys()) {
    g.setNode(`couple::${key}`, { width: COUPLE_SIZE, height: COUPLE_SIZE })
  }

  const addedEdges = new Set<string>()
  function dagEdge(src: string, tgt: string) {
    const k = `${src}→${tgt}`
    if (!addedEdges.has(k)) { addedEdges.add(k); g.setEdge(src, tgt) }
  }

  for (const [key, { p1, p2 }] of couplesWithChildren) {
    dagEdge(p1, `couple::${key}`)
    dagEdge(p2, `couple::${key}`)
  }

  for (const [childId, pSet] of parentsOf) {
    const key = childCoupleKey.get(childId)
    if (key) {
      dagEdge(`couple::${key}`, childId)
    } else {
      const parent = Array.from(pSet)[0]
      if (parent) dagEdge(parent, childId)
    }
  }

  dagre.layout(g)

  const posX = (id: string) => (g.node(id)?.x ?? 0)

  const nodes: Node[] = [
    ...people.map((p) => {
      const dn = g.node(p.id)
      return {
        id: p.id,
        type: 'person',
        data: { label: `${p.first_name} ${p.last_name ?? ''}`, ...p },
        position: { x: (dn?.x ?? 0) - NODE_W / 2, y: (dn?.y ?? 0) - NODE_H / 2 },
      }
    }),
    ...[...couplesWithChildren.keys()].map((key) => {
      const id = `couple::${key}`
      const dn = g.node(id)
      return {
        id,
        type: 'couple' as const,
        data: {},
        position: { x: (dn?.x ?? 0) - COUPLE_SIZE / 2, y: (dn?.y ?? 0) - COUPLE_SIZE / 2 },
      }
    }),
  ]

  const edges: Edge[] = []
  const GREY  = { stroke: '#94a3b8', strokeWidth: 2 }
  const ARROW = { type: MarkerType.ArrowClosed, color: '#94a3b8' }

  for (const [key, { p1, p2 }] of couplesWithChildren) {
    const coupleId = `couple::${key}`
    edges.push({ id: `${p1}→${coupleId}`, source: p1, target: coupleId, type: 'smoothstep', style: GREY })
    edges.push({ id: `${p2}→${coupleId}`, source: p2, target: coupleId, type: 'smoothstep', style: GREY })

    const [left, right] = posX(p1) <= posX(p2) ? [p1, p2] : [p2, p1]
    edges.push({
      id: `spouse::${key}`,
      source: left,
      sourceHandle: 'right',
      target: right,
      targetHandle: 'left',
      type: 'spouseArc',
    })
  }

  for (const [childId, pSet] of parentsOf) {
    const key = childCoupleKey.get(childId)
    if (key) {
      const coupleId = `couple::${key}`
      edges.push({ id: `${coupleId}→${childId}`, source: coupleId, target: childId, type: 'smoothstep', style: GREY, markerEnd: ARROW })
    } else {
      const parent = Array.from(pSet)[0]
      if (parent) {
        edges.push({ id: `${parent}→${childId}`, source: parent, target: childId, type: 'smoothstep', style: GREY, markerEnd: ARROW })
      }
    }
  }

  for (const r of spouseRels) {
    const key = [r.from_person_id, r.to_person_id].sort().join('::')
    if (!couplesWithChildren.has(key)) {
      const [left, right] = posX(r.from_person_id) <= posX(r.to_person_id)
        ? [r.from_person_id, r.to_person_id]
        : [r.to_person_id, r.from_person_id]
      edges.push({
        id: `spouse::${key}`,
        source: left,
        sourceHandle: 'right',
        target: right,
        targetHandle: 'left',
        type: 'spouseArc',
      })
    }
  }

  return { nodes, edges }
}

// ── FamilyTreeCanvas ────────────────────────────────────────────────────────

export default function FamilyTreeCanvas({ people, relationships }: { people: any[]; relationships: any[] }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(people, relationships),
    [people, relationships]
  )

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      minZoom={0.2}
      maxZoom={2}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
      <Controls showInteractive={false} />
      <MiniMap
        nodeStrokeWidth={3}
        zoomable
        pannable
        style={{ background: '#f8fafc' }}
      />
    </ReactFlow>
  )
}
