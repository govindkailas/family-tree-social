'use client'
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import dagre from 'dagre'
import { buildTree } from './FamilyTreeList'
import { getAvatarUrl } from '@/lib/avatar'

// ── types ──────────────────────────────────────────────────────────────────

type Person = {
  id: string
  first_name: string
  last_name?: string | null
  nick_name?: string | null
  birth_date?: string | null
  death_date?: string | null
  avatar_url?: string | null
  social_links?: any[] | null
}

type RawTreeNode = { personId: string; spouseIds: string[]; childNodes: RawTreeNode[] }

type NodeDatum = {
  id: string
  person: Person
  spouse?: Person
  initials: string
  spouseInitials?: string
  name: string
  spouseName?: string
  birthYear?: number
  deathYear?: number
  accent: string
  lightBg: string
  hasChildren: boolean
  isCollapsed: boolean
  w: number
  h: number
  // set by dagre layout
  x: number
  y: number
}

type EdgeDatum = { source: string; target: string }

// ── constants ──────────────────────────────────────────────────────────────

const BOX_W        = 210
const BOX_H_SINGLE = 58
const BOX_H_COUPLE = 92
const AVATAR_R     = 16
const AVATAR_CX    = 24  // center x of avatar circle inside card
const TEXT_X       = AVATAR_CX * 2 + 6

// ── palette ────────────────────────────────────────────────────────────────

const PALETTE: [string, string][] = [
  ['#f59e0b', '#fef3c7'],
  ['#10b981', '#d1fae5'],
  ['#3b82f6', '#dbeafe'],
  ['#8b5cf6', '#ede9fe'],
  ['#f43f5e', '#ffe4e6'],
  ['#ea580c', '#ffedd5'],
  ['#0d9488', '#ccfbf1'],
]

function getPalette(seed: string): [string, string] {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff
  return PALETTE[h % PALETTE.length]
}

function getInitials(first: string, last?: string | null) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function truncate(s: string, max = 24) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── graph builder ──────────────────────────────────────────────────────────

function buildVisible(
  roots: RawTreeNode[],
  personMap: Map<string, Person>,
  collapsed: Set<string>
): { nodes: Omit<NodeDatum, 'x' | 'y'>[]; edges: EdgeDatum[] } {
  const nodes: Omit<NodeDatum, 'x' | 'y'>[] = []
  const edges: EdgeDatum[] = []
  const seen = new Set<string>()

  function visit(node: RawTreeNode, colorIdx: number) {
    if (seen.has(node.personId)) return
    seen.add(node.personId)

    const person = personMap.get(node.personId)
    if (!person) return

    const spouse = node.spouseIds[0] ? personMap.get(node.spouseIds[0]) : undefined
    const [accent, lightBg] = PALETTE[colorIdx % PALETTE.length]
    const hasChildren = node.childNodes.length > 0
    const isCollapsed = collapsed.has(node.personId)

    nodes.push({
      id:            node.personId,
      person,
      spouse,
      initials:      getInitials(person.first_name, person.last_name),
      spouseInitials: spouse ? getInitials(spouse.first_name, spouse.last_name) : undefined,
      name:          [person.first_name, person.last_name].filter(Boolean).join(' '),
      spouseName:    spouse ? [spouse.first_name, spouse.last_name].filter(Boolean).join(' ') : undefined,
      birthYear:     person.birth_date ? new Date(person.birth_date + 'T00:00:00').getFullYear() : undefined,
      deathYear:     person.death_date ? new Date(person.death_date + 'T00:00:00').getFullYear() : undefined,
      accent,
      lightBg,
      hasChildren,
      isCollapsed,
      w: BOX_W,
      h: spouse ? BOX_H_COUPLE : BOX_H_SINGLE,
    })

    if (!isCollapsed) {
      node.childNodes.forEach((child, i) => {
        edges.push({ source: node.personId, target: child.personId })
        // Each sibling gets a distinct palette index, stepping forward from parent
        visit(child, (colorIdx + 1 + i) % PALETTE.length)
      })
    }
  }

  roots.forEach((r, i) => visit(r, i % PALETTE.length))
  return { nodes, edges }
}

// ── dagre layout ───────────────────────────────────────────────────────────

function layout(nodes: Omit<NodeDatum, 'x' | 'y'>[], edges: EdgeDatum[]): NodeDatum[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', ranksep: 110, nodesep: 24, marginx: 60, marginy: 60 })

  nodes.forEach(n => g.setNode(n.id, { width: n.w, height: n.h }))
  edges.forEach(e => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    return { ...n, x: (pos?.x ?? 0) - n.w / 2, y: (pos?.y ?? 0) - n.h / 2 }
  })
}

// ── elbow path ─────────────────────────────────────────────────────────────

function elbowPath(source: NodeDatum, target: NodeDatum): string {
  const sx = source.x + source.w          // right edge of source card
  const sy = source.y + source.h / 2      // vertical center of source
  const tx = target.x                     // left edge of target card
  const ty = target.y + target.h / 2      // vertical center of target
  const mx = sx + (tx - sx) / 2           // midpoint x
  return `M${sx},${sy} H${mx} V${ty} H${tx}`
}

// ── PersonAvatar ───────────────────────────────────────────────────────────

function PersonAvatar({
  cx, cy, r, accent, lightBg, initials, avatarUrl,
}: {
  cx: number; cy: number; r: number
  accent: string; lightBg: string; initials: string; avatarUrl?: string | null
}) {
  const [err, setErr] = useState(false)
  const show = !!avatarUrl && !err

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={lightBg} stroke={accent} strokeWidth={1.5} />
      {show ? (
        <image
          href={avatarUrl!}
          x={cx - r} y={cy - r} width={r * 2} height={r * 2}
          clipPath={`circle(${r}px at ${r}px ${r}px)`}
          style={{ borderRadius: '50%' }}
          onError={() => setErr(true)}
        />
      ) : (
        <text
          x={cx} y={cy}
          textAnchor="middle" dominantBaseline="central"
          fontSize={10} fontWeight={700} fill={accent}
        >
          {initials}
        </text>
      )}
    </g>
  )
}

// ── NodeCard ───────────────────────────────────────────────────────────────

function NodeCard({
  node,
  onToggle,
  isRoot,
}: {
  node: NodeDatum
  onToggle: (id: string) => void
  isRoot: boolean
}) {
  const { x, y, w, h, accent, lightBg, person, spouse } = node
  const personAvatarUrl = getAvatarUrl(person.avatar_url ?? null, person.social_links ?? [])
  const spouseAvatarUrl = spouse ? getAvatarUrl(spouse.avatar_url ?? null, spouse.social_links ?? []) : null

  const personCY = spouse ? h * 0.28 : h / 2
  const spouseCY = h * 0.73

  const dateLabel = node.birthYear
    ? (node.deathYear ? `${node.birthYear} – ${node.deathYear}` : `b. ${node.birthYear}`)
    : ''

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Card background — click to expand/collapse */}
      <rect
        width={w} height={h} rx={10} ry={10}
        fill={isRoot ? '#fefce8' : lightBg}
        stroke={isRoot ? '#f59e0b' : accent + '66'}
        strokeWidth={isRoot ? 2 : 1.5}
        style={{
          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.08))',
          cursor: node.hasChildren ? 'pointer' : 'default',
        }}
        onClick={() => node.hasChildren && onToggle(node.id)}
      />

      {/* Person: avatar + name + date — all one tappable anchor */}
      <a
        href={`/dashboard/people/${person.id}`}
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: 'pointer' }}
      >
        <PersonAvatar
          cx={AVATAR_CX} cy={personCY}
          r={AVATAR_R} accent={accent} lightBg={lightBg}
          initials={node.initials} avatarUrl={personAvatarUrl}
        />
        <text
          x={TEXT_X} y={personCY - (dateLabel && !spouse ? 7 : 6)}
          fontSize={12} fontWeight={600} fill="#1e293b"
          dominantBaseline="auto"
        >
          {truncate(node.name, 22)}
        </text>
        {dateLabel && (
          <text
            x={TEXT_X} y={personCY + (spouse ? 8 : 9)}
            fontSize={9.5} fill="#94a3b8"
            dominantBaseline="auto"
          >
            {dateLabel}
          </text>
        )}
      </a>

      {/* Divider + spouse */}
      {spouse && (
        <>
          {/* Divider line with heart centred on it */}
          <line x1={8} y1={h / 2} x2={w / 2 - 10} y2={h / 2} stroke="#e2e8f0" strokeWidth={1} />
          <text
            x={w / 2} y={h / 2}
            textAnchor="middle" dominantBaseline="central"
            fontSize={13} fill="#f43f5e"
            style={{ pointerEvents: 'none' }}
          >♥</text>
          <line x1={w / 2 + 10} y1={h / 2} x2={w - 8} y2={h / 2} stroke="#e2e8f0" strokeWidth={1} />

          {/* Spouse: avatar + name — tappable anchor */}
          <a
            href={`/dashboard/people/${spouse.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer' }}
          >
            <PersonAvatar
              cx={AVATAR_CX} cy={spouseCY}
              r={AVATAR_R} accent={accent} lightBg={lightBg}
              initials={node.spouseInitials ?? ''} avatarUrl={spouseAvatarUrl}
            />
            <text
              x={TEXT_X} y={spouseCY - 1}
              fontSize={12} fontWeight={600} fill="#1e293b"
              dominantBaseline="central"
            >
              {truncate(node.spouseName ?? '', 22)}
            </text>
          </a>
        </>
      )}

      {/* Expand / collapse button */}
      {node.hasChildren && (
        <g
          transform={`translate(${w - 14}, ${h / 2})`}
          onClick={(e) => { e.stopPropagation(); onToggle(node.id) }}
          style={{ cursor: 'pointer' }}
        >
          <circle r={9} fill="white" stroke={accent + '55'} strokeWidth={1} />
          <text
            textAnchor="middle" dominantBaseline="central"
            fontSize={13} fontWeight={700} fill={accent}
          >
            {node.isCollapsed ? '+' : '−'}
          </text>
        </g>
      )}
    </g>
  )
}

// ── FamilyTreeD3 ───────────────────────────────────────────────────────────

export default function FamilyTreeD3({ people, relationships }: { people: any[]; relationships: any[] }) {
  const svgRef    = useRef<SVGSVGElement>(null)
  const [vw, setVw] = useState(1200)
  const [vh, setVh] = useState(700)

  // Track viewport size
  useEffect(() => {
    const el = svgRef.current?.parentElement
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setVw(entry.contentRect.width)
      setVh(entry.contentRect.height)
    })
    ro.observe(el)
    setVw(el.clientWidth)
    setVh(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  // Zoom / pan state
  const [tx, setTx] = useState(60)
  const [ty, setTy] = useState(0)
  const [scale, setScale] = useState(1)
  const isPanning = useRef(false)
  const lastPan   = useRef({ x: 0, y: 0 })

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(2, Math.max(0.2, s - e.deltaY * 0.001)))
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('a')) return
    isPanning.current = true
    lastPan.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    setTx(v => v + e.clientX - lastPan.current.x)
    setTy(v => v + e.clientY - lastPan.current.y)
    lastPan.current = { x: e.clientX, y: e.clientY }
  }, [])

  const stopPan = useCallback(() => { isPanning.current = false }, [])

  // Tree data
  const { personMap, roots } = useMemo(
    () => buildTree(people, relationships),
    [people, relationships]
  )

  // Collapse state — collapse everything beyond depth 1 initially
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const s = new Set<string>()
    function mark(node: RawTreeNode, depth: number) {
      if (depth >= 1 && node.childNodes.length > 0) s.add(node.personId)
      node.childNodes.forEach(c => mark(c, depth + 1))
    }
    roots.forEach(r => mark(r, 0))
    return s
  })

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Build & layout graph
  const { positioned, edges: edgeDefs, nodeMap } = useMemo(() => {
    const { nodes: rawNodes, edges } = buildVisible(roots, personMap, collapsed)
    const positioned = layout(rawNodes, edges)
    const nodeMap    = new Map(positioned.map(n => [n.id, n]))
    return { positioned, edges, nodeMap }
  }, [roots, personMap, collapsed])

  // Center on first render
  const initialised = useRef(false)
  useEffect(() => {
    if (initialised.current || positioned.length === 0 || vw === 0) return
    initialised.current = true
    // Find the root node (first in roots list) and center the view on it
    const rootNode = positioned.find(n => n.id === roots[0]?.personId)
    if (rootNode) {
      setTx(60)
      setTy(vh / 2 - (rootNode.y + rootNode.h / 2) * scale)
    }
  }, [positioned, vw, vh, roots, scale])

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <span className="text-5xl">🌱</span>
        <p className="text-sm font-medium">Your family tree is empty.</p>
        <p className="text-xs">Add the first person to get started.</p>
      </div>
    )
  }

  // Compute SVG canvas size (add padding)
  const maxX = Math.max(...positioned.map(n => n.x + n.w), 400) + 80
  const maxY = Math.max(...positioned.map(n => n.y + n.h), 300) + 80

  const rootIds = new Set(roots.map(r => r.personId))

  return (
    <svg
      ref={svgRef}
      width={vw} height={vh}
      style={{ background: '#f8fafc', cursor: isPanning.current ? 'grabbing' : 'grab', display: 'block' }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopPan}
      onMouseLeave={stopPan}
    >
      <g transform={`translate(${tx},${ty}) scale(${scale})`}>
        {/* Edges — drawn behind nodes */}
        {edgeDefs.map(e => {
          const s = nodeMap.get(e.source)
          const t = nodeMap.get(e.target)
          if (!s || !t) return null
          return (
            <path
              key={`${e.source}-${e.target}`}
              d={elbowPath(s, t)}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          )
        })}

        {/* Nodes */}
        {positioned.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            onToggle={toggleCollapse}
            isRoot={rootIds.has(node.id)}
          />
        ))}
      </g>

      {/* Zoom hint */}
      <text x={vw - 12} y={vh - 10} textAnchor="end" fontSize={10} fill="#cbd5e1">
        scroll to zoom · drag to pan · click card to expand
      </text>
    </svg>
  )
}
