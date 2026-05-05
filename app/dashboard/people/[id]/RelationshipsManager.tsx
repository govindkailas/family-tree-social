'use client'
import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Search, UserPlus, Mail } from 'lucide-react'
import Link from 'next/link'

// ── types ──────────────────────────────────────────────────────────────────

type Person = {
  id: string
  first_name: string
  last_name?: string | null
  nick_name?: string | null
}

type Relationship = {
  id: string
  type: 'parent_child' | 'spouse'
  from_person_id: string
  to_person_id: string
  from_person: Person
  to_person: Person
}

type RelSection = 'parent' | 'spouse' | 'child'

interface Props {
  personId: string
  familyId: string
  initialRelationships: Relationship[]
  allPeople: Person[]
  isOwner: boolean
  canEdit?: boolean
}

// ── helpers ────────────────────────────────────────────────────────────────

function fullName(p: Person) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

// ── component ──────────────────────────────────────────────────────────────

export default function RelationshipsManager({
  personId,
  familyId,
  initialRelationships,
  allPeople,
  isOwner,
  canEdit = false,
}: Props) {
  const supabase = createClient()

  const [relationships, setRelationships] = useState<Relationship[]>(initialRelationships)
  const [adding, setAdding] = useState<RelSection | null>(null)
  const [mode, setMode] = useState<'search' | 'new'>('search')
  const [query, setQuery] = useState('')
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')
  const [newBirth, setNewBirth] = useState('')
  const [saving, setSaving] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)

  // ── derived relationship groups ──────────────────────────────────────────

  const parents = relationships
    .filter((r) => r.type === 'parent_child' && r.to_person_id === personId)
    .map((r) => ({ relId: r.id, person: r.from_person }))

  const children = relationships
    .filter((r) => r.type === 'parent_child' && r.from_person_id === personId)
    .map((r) => ({ relId: r.id, person: r.to_person }))

  const spouses = relationships
    .filter((r) => r.type === 'spouse')
    .map((r) => ({
      relId: r.id,
      person: r.from_person_id === personId ? r.to_person : r.from_person,
    }))

  // ── available people for the picker ─────────────────────────────────────

  const linkedIds = new Set([
    personId,
    ...parents.map((x) => x.person.id),
    ...children.map((x) => x.person.id),
    ...spouses.map((x) => x.person.id),
  ])

  const available = allPeople.filter((p) => {
    if (linkedIds.has(p.id)) return false
    if (query.trim().length < 1) return true
    return fullName(p).toLowerCase().includes(query.toLowerCase()) ||
      (p.nick_name ?? '').toLowerCase().includes(query.toLowerCase())
  })

  // ── actions ───────────────────────────────────────────────────────────────

  function relArgs(section: RelSection, otherId: string) {
    if (section === 'parent')
      return { from_person_id: otherId, to_person_id: personId, type: 'parent_child' as const }
    if (section === 'child')
      return { from_person_id: personId, to_person_id: otherId, type: 'parent_child' as const }
    return { from_person_id: personId, to_person_id: otherId, type: 'spouse' as const }
  }

  const REL_SELECT =
    'id, type, from_person_id, to_person_id, from_person:people!from_person_id(id,first_name,last_name,nick_name), to_person:people!to_person_id(id,first_name,last_name,nick_name)'

  /**
   * After adding a child, automatically link every existing spouse as a
   * co-parent of that child (skip if the link already exists).
   */
  async function autoLinkSpouses(childId: string, newRels: Relationship[]) {
    const combined = [...relationships, ...newRels]
    const added: Relationship[] = []

    for (const { person: spouse } of spouses) {
      const alreadyParent = combined.some(
        (r) =>
          r.type === 'parent_child' &&
          r.from_person_id === spouse.id &&
          r.to_person_id === childId
      )
      if (alreadyParent) continue

      const { data: spouseRel } = await supabase
        .from('relationships')
        .insert({
          family_id: familyId,
          from_person_id: spouse.id,
          to_person_id: childId,
          type: 'parent_child',
        })
        .select(REL_SELECT)
        .single()

      if (spouseRel) added.push(spouseRel as unknown as Relationship)
    }

    if (added.length > 0) {
      setRelationships((prev) => [...prev, ...added])
    }
  }

  async function linkExisting(p: Person) {
    if (!adding) return
    setSaving(true)
    const args = relArgs(adding, p.id)
    const { data: rel } = await supabase
      .from('relationships')
      .insert({ family_id: familyId, ...args })
      .select(REL_SELECT)
      .single()

    const newRels: Relationship[] = rel ? [rel as unknown as Relationship] : []
    if (newRels.length) setRelationships((prev) => [...prev, ...newRels])

    // Auto-link spouses as co-parents when adding a child
    if (adding === 'child' && spouses.length > 0) {
      await autoLinkSpouses(p.id, newRels)
    }

    if (showInvite && inviteEmail) await sendInvite(inviteEmail)

    setSaving(false)
    reset()
  }

  async function createAndLink() {
    if (!adding || !newFirst.trim()) return
    setSaving(true)

    // 1. Create the new person
    const { data: newPerson } = await supabase
      .from('people')
      .insert({
        family_id: familyId,
        first_name: newFirst.trim(),
        last_name: newLast.trim() || null,
        birth_date: newBirth || null,
      })
      .select('id, first_name, last_name, nick_name')
      .single()

    if (!newPerson) { setSaving(false); return }

    // 2. Create the primary relationship
    const args = relArgs(adding, newPerson.id)
    const { data: rel } = await supabase
      .from('relationships')
      .insert({ family_id: familyId, ...args })
      .select(REL_SELECT)
      .single()

    const newRels: Relationship[] = rel ? [rel as unknown as Relationship] : []
    if (newRels.length) setRelationships((prev) => [...prev, ...newRels])

    // Auto-link spouses as co-parents when adding a child
    if (adding === 'child' && spouses.length > 0) {
      await autoLinkSpouses(newPerson.id, newRels)
    }

    if (showInvite && inviteEmail) await sendInvite(inviteEmail)

    setSaving(false)
    reset()
  }

  async function removeRelationship(relId: string) {
    await supabase.from('relationships').delete().eq('id', relId)
    setRelationships((prev) => prev.filter((r) => r.id !== relId))
  }

  function reset() {
    setAdding(null)
    setMode('search')
    setQuery('')
    setNewFirst('')
    setNewLast('')
    setNewBirth('')
    setShowInvite(false)
    setInviteEmail('')
    setInviteSent(false)
  }

  async function sendInvite(email: string) {
    if (!email.trim()) return
    await supabase.from('family_members').insert({
      family_id: familyId,
      email: email.trim(),
      role: 'member',
      approved: false,
    })
    setInviteSent(true)
  }

  // ── section config ────────────────────────────────────────────────────────

  const sections: {
    key: RelSection
    label: string
    items: { relId: string; person: Person }[]
    emptyLabel: string
  }[] = [
    { key: 'parent', label: 'Parents', items: parents, emptyLabel: 'No parents added yet.' },
    { key: 'spouse', label: 'Spouses / Partners', items: spouses, emptyLabel: 'No partners added yet.' },
    { key: 'child', label: 'Children', items: children, emptyLabel: 'No children added yet.' },
  ]

  const inputCls =
    'w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-gray-400'

  return (
    <div className="space-y-5">
      {sections.map(({ key, label, items, emptyLabel }) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">{label}</h3>
            {adding !== key && (isOwner || (canEdit && key === 'child')) && (
              <button
                onClick={() => { setAdding(key); setMode('search') }}
                className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
              >
                <Plus size={13} /> Add
              </button>
            )}
          </div>

          <div className="px-5 py-3 space-y-1.5">
            {/* Existing items */}
            {items.length === 0 && adding !== key && (
              <p className="text-xs text-gray-400 py-1">{emptyLabel}</p>
            )}
            {items.map(({ relId, person }) => (
              <div
                key={relId}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 group"
              >
                <Link
                  href={`/dashboard/people/${person.id}`}
                  className="text-sm text-gray-900 hover:underline decoration-dotted underline-offset-2"
                >
                  {fullName(person)}
                  {person.nick_name && (
                    <span className="text-gray-400 ml-1.5 text-xs">"{person.nick_name}"</span>
                  )}
                </Link>
                <button
                  onClick={() => removeRelationship(relId)}
                  className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove relationship"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {/* Add panel */}
            {adding === key && (
              <div className="mt-2 border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                {/* Co-parent notice — only shown in the Children section when spouses exist */}
                {key === 'child' && spouses.length > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                    <span className="mt-px shrink-0">✦</span>
                    <span>
                      {spouses.length === 1
                        ? <><strong>{fullName(spouses[0].person)}</strong> will also be linked as a parent automatically.</>
                        : <>{spouses.map((s) => <strong key={s.relId}>{fullName(s.person)}</strong>).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ' and ', el], [])} will also be linked as parents automatically.</>
                      }
                    </span>
                  </div>
                )}
                {/* Mode toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('search')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border transition-colors ${
                      mode === 'search'
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Search size={11} /> Existing member
                  </button>
                  <button
                    onClick={() => setMode('new')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border transition-colors ${
                      mode === 'new'
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <UserPlus size={11} /> New person
                  </button>
                </div>

                {/* Search existing */}
                {mode === 'search' && (
                  <div>
                    <input
                      autoFocus
                      placeholder="Search by name…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className={inputCls}
                    />
                    <div className="mt-2 max-h-44 overflow-y-auto space-y-0.5">
                      {available.length === 0 ? (
                        <p className="text-xs text-gray-400 px-1 py-2">
                          {allPeople.length === 0
                            ? 'No other members in the family yet.'
                            : 'No unlinked members match your search.'}
                        </p>
                      ) : (
                        available.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => linkExisting(p)}
                            disabled={saving}
                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white text-gray-900 disabled:opacity-50 transition-colors flex items-center justify-between group/item"
                          >
                            <span>
                              {fullName(p)}
                              {p.nick_name && (
                                <span className="text-gray-400 ml-1.5 text-xs">"{p.nick_name}"</span>
                              )}
                            </span>
                            <span className="text-[10px] text-gray-300 group-hover/item:text-amber-500 transition-colors">
                              Link →
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* New person */}
                {mode === 'new' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        autoFocus
                        placeholder="First name *"
                        value={newFirst}
                        onChange={(e) => setNewFirst(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        placeholder="Last name"
                        value={newLast}
                        onChange={(e) => setNewLast(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <input
                      type="date"
                      value={newBirth}
                      onChange={(e) => setNewBirth(e.target.value)}
                      className={inputCls}
                    />
                    <button
                      onClick={createAndLink}
                      disabled={!newFirst.trim() || saving}
                      className="w-full bg-gray-900 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Creating…' : `Create & add as ${key}`}
                    </button>
                  </div>
                )}

                {/* Invite section — child & spouse only, owner only */}
                {(key === 'child' || key === 'spouse') && isOwner && (
                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    {!showInvite ? (
                      <button
                        type="button"
                        onClick={() => setShowInvite(true)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-600 transition-colors"
                      >
                        <Mail size={11} /> Also invite them to the app
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                          <Mail size={11} /> Invite email
                        </label>
                        <input
                          type="email"
                          placeholder="their@email.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className={inputCls}
                        />
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          They can sign in with this email to view and edit their profile.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={reset}
                  className="text-xs text-gray-400 hover:text-gray-600 w-full text-center transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
