'use client'
import { useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'
import PersonNode from './PersonNode'

const nodeTypes = { person: PersonNode }

function buildGraph(people: any[], relationships: any[]) {
  const nodes: Node[] = people.map((p) => ({
    id: p.id,
    type: 'person',
    data: {
      label: `${p.first_name} ${p.last_name ?? ''}`,
      ...p,
    },
    position: { x: 0, y: 0 },
  }))

  const edges: Edge[] = relationships
    .filter((r) => r.type === 'parent_child')
    .map((r) => ({
      id: r.id,
      source: r.from_person_id,
      target: r.to_person_id,
      type: 'smoothstep',
      label: 'child',
    }))
    .concat(
      relationships
        .filter((r) => r.type === 'spouse')
        .map((r) => ({
          id: r.id,
          source: r.from_person_id,
          target: r.to_person_id,
          type: 'smoothstep',
          style: { strokeDasharray: '5,5' },
          label: 'spouse',
        }))
    )

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 80 })

  nodes.forEach((node) => g.setNode(node.id, { width: 160, height: 60 }))
  edges.forEach((edge) => g.setEdge(edge.source, edge.target))

  dagre.layout(g)

  return {
    nodes: nodes.map((node) => {
      const dagreNode = g.node(node.id)
      return {
        ...node,
        position: {
          x: dagreNode.x - 80,
          y: dagreNode.y - 30,
        },
      }
    }),
    edges,
  }
}

export default function FamilyTree({ people, relationships }: { people: any[]; relationships: any[] }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(people, relationships),
    [people, relationships]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={false}
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
