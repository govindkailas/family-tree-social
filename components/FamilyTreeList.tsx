'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Heart } from 'lucide-react'
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

type Relationship = {
  type: 'parent_child' | 'spouse'
  from_person_id: string
  to_person_id: string
}

export type TreeNode = {
  personId: string
  spouseIds: string[]
  childNodes: TreeNode[]
}

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

const SOCIAL: Record<string, { abbr: string; bg: string; fg: string }> = {
  facebook:  { abbr: 'fb', bg: '#e7f0fd', fg: '#1877f2' },
  instagram: { abbr: 'ig', bg: '#fce4ec', fg: '#e1306c' },
  linkedin:  { abbr: 'in', bg: '#e8f4fb', fg: '#0077b5' },
  twitter:   { abbr: 'x',  bg: '#f1f5f9', fg: '#334155' },
}

// ── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ person }: { person: Person }) {
  const [imgError, setImgError] = useState(false)
  const seed = `${person.first_name}${person.last_name ?? ''}`
  const [accent, lightBg] = getPalette(seed)
  const initials = getInitials(person.first_name, person.last_name)
  const avatarUrl = getAvatarUrl(person.avatar_url ?? null, person.social_links ?? [])
  const showImg = !!avatarUrl && !imgError

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
      style={{
        background: showImg ? 'transparent' : lightBg,
        border: `2px solid ${accent}55`,
        color: accent,
        boxShadow: `0 0 0 1px ${accent}22`,
      }}
    >
      {showImg ? (
        <img
          src={avatarUrl!}
          alt={initials}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </div>
  )
}

// ── PersonCard ─────────────────────────────────────────────────────────────

function PersonCard({ person }: { person: Person }) {
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(' ')
  const birthYear = person.birth_date
    ? new Date(person.birth_date + 'T00:00:00').getFullYear()
    : null
  const deathYear = person.death_date
    ? new Date(person.death_date + 'T00:00:00').getFullYear()
    : null
  const hasSocial = (person.social_links?.length ?? 0) > 0

  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <Link href={`/dashboard/people/${person.id}`} className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Avatar person={person} />
      </Link>
      <div className="min-w-0">
        <Link href={`/dashboard/people/${person.id}`} className="group" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors leading-tight">
            {fullName}
            {person.nick_name && (
              <span className="text-gray-400 font-normal ml-1 text-xs">&ldquo;{person.nick_name}&rdquo;</span>
            )}
          </p>
          {(birthYear || deathYear) && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {birthYear ?? '?'}{deathYear ? ` – ${deathYear}` : ''}
            </p>
          )}
        </Link>
        {hasSocial && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {(person.social_links as any[]).slice(0, 4).map((link, i) => {
              const cfg = SOCIAL[link.platform]
              return (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide hover:opacity-75 transition-opacity"
                  style={cfg ? { background: cfg.bg, color: cfg.fg } : { background: '#f1f5f9', color: '#64748b' }}
                >
                  {cfg ? cfg.abbr : (link.label || '↗')}
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── FamilyNode ─────────────────────────────────────────────────────────────

function FamilyNode({ node, personMap, depth }: { node: TreeNode; personMap: Map<string, Person>; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  const person = personMap.get(node.personId)
  if (!person) return null

  const hasChildren = node.childNodes.length > 0
  const seed = `${person.first_name}${person.last_name ?? ''}`
  const [accent] = getPalette(seed)

  return (
    <div className={depth > 0 ? 'ml-5 border-l-2 border-gray-100 pl-3' : ''}>
      <div
        className={`flex items-start gap-2 py-3 ${hasChildren ? 'cursor-pointer' : ''}`}
        onClick={hasChildren ? () => setExpanded((e) => !e) : undefined}
      >
        <div className="w-6 h-6 mt-2 shrink-0 flex items-center justify-center">
          {hasChildren && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: expanded ? `${accent}22` : '#f1f5f9', color: expanded ? accent : '#94a3b8' }}
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
            <PersonCard person={person} />
            {node.spouseIds.map((sid) => {
              const spouse = personMap.get(sid)
              return spouse ? (
                <div key={sid} className="flex items-start gap-2">
                  <Heart size={10} className="text-rose-300 mt-3.5 shrink-0" />
                  <PersonCard person={spouse} />
                </div>
              ) : null
            })}
          </div>
          {hasChildren && !expanded && (
            <p className="text-[11px] text-gray-400 mt-1.5 ml-0.5">
              {node.childNodes.length} {node.childNodes.length === 1 ? 'child' : 'children'} — tap to expand
            </p>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="pb-2">
          {node.childNodes.map((child) => (
            <FamilyNode key={child.personId} node={child} personMap={personMap} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── buildTree ──────────────────────────────────────────────────────────────

export function buildTree(people: Person[], relationships: Relationship[]) {
  const spouseRels = relationships.filter((r) => r.type === 'spouse')
  const pcRels     = relationships.filter((r) => r.type === 'parent_child')

  const personMap  = new Map(people.map((p) => [p.id, p]))
  const childrenOf = new Map<string, Set<string>>()
  const parentsOf  = new Map<string, Set<string>>()
  const spousesOf  = new Map<string, Set<string>>()

  for (const r of pcRels) {
    if (!childrenOf.has(r.from_person_id)) childrenOf.set(r.from_person_id, new Set())
    childrenOf.get(r.from_person_id)!.add(r.to_person_id)
    if (!parentsOf.has(r.to_person_id)) parentsOf.set(r.to_person_id, new Set())
    parentsOf.get(r.to_person_id)!.add(r.from_person_id)
  }

  for (const r of spouseRels) {
    if (!spousesOf.has(r.from_person_id)) spousesOf.set(r.from_person_id, new Set())
    spousesOf.get(r.from_person_id)!.add(r.to_person_id)
    if (!spousesOf.has(r.to_person_id)) spousesOf.set(r.to_person_id, new Set())
    spousesOf.get(r.to_person_id)!.add(r.from_person_id)
  }

  const placed = new Set<string>()

  function buildNode(personId: string): TreeNode | null {
    if (placed.has(personId)) return null
    placed.add(personId)

    const spouseIds = Array.from(spousesOf.get(personId) ?? []).filter((id) => !placed.has(id))
    spouseIds.forEach((id) => placed.add(id))

    const childIds = new Set<string>()
    for (const id of [personId, ...spouseIds]) {
      for (const childId of childrenOf.get(id) ?? []) {
        if (!placed.has(childId)) childIds.add(childId)
      }
    }

    const childNodes = Array.from(childIds)
      .map((id) => buildNode(id))
      .filter((n): n is TreeNode => n !== null)

    return { personId, spouseIds, childNodes }
  }

  function isMarryingIn(id: string) {
    const spouseIds = Array.from(spousesOf.get(id) ?? [])
    return spouseIds.length > 0 && spouseIds.every(
      (sid) => parentsOf.has(sid) && parentsOf.get(sid)!.size > 0
    )
  }

  function countDescendants(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0
    visited.add(id)
    let count = 1
    for (const childId of childrenOf.get(id) ?? []) count += countDescendants(childId, visited)
    for (const sid of spousesOf.get(id) ?? []) {
      for (const childId of childrenOf.get(sid) ?? []) count += countDescendants(childId, visited)
    }
    return count
  }

  const rootCandidates = people
    .filter((p) => (!parentsOf.has(p.id) || parentsOf.get(p.id)!.size === 0) && !isMarryingIn(p.id))
    .sort((a, b) => countDescendants(b.id) - countDescendants(a.id))

  const rootNodes = rootCandidates.map((p) => buildNode(p.id)).filter((n): n is TreeNode => n !== null)
  const orphanNodes = people.filter((p) => !placed.has(p.id)).map((p) => buildNode(p.id)).filter((n): n is TreeNode => n !== null)

  return { personMap, roots: [...rootNodes, ...orphanNodes] }
}

// ── FamilyTreeList ─────────────────────────────────────────────────────────

export default function FamilyTreeList({ people, relationships }: { people: any[]; relationships: any[] }) {
  const { personMap, roots } = useMemo(
    () => buildTree(people as Person[], relationships as Relationship[]),
    [people, relationships]
  )

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {roots.map((root) => (
          <div key={root.personId} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-3 py-1">
            <FamilyNode node={root} personMap={personMap} depth={0} />
          </div>
        ))}
      </div>
    </div>
  )
}
