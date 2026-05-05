'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Paperclip, Send, Loader2 } from 'lucide-react'

// ── types ─────────────────────────────────────────────────────────────────────

type Person = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  linked_user_id: string | null
}

type Relationship = {
  type: 'parent_child' | 'spouse'
  from_person_id: string
  to_person_id: string
}

type Recipient = {
  personId: string
  name: string
  email: string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fullName(p: Person) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

/**
 * Derive sets of relative IDs by group for a given personId.
 * - close:    parents, spouses, siblings, children
 * - extended: grandparents, grandchildren, aunts/uncles, cousins, spouses-of-children
 */
function buildRelativeGroups(
  personId: string,
  relationships: Relationship[]
): { close: Set<string>; extended: Set<string> } {
  const close    = new Set<string>()
  const extended = new Set<string>()

  const parentsOf    = (id: string) => relationships.filter(r => r.type === 'parent_child' && r.to_person_id   === id).map(r => r.from_person_id)
  const childrenOf   = (id: string) => relationships.filter(r => r.type === 'parent_child' && r.from_person_id === id).map(r => r.to_person_id)
  const spousesOf    = (id: string) => relationships.filter(r => r.type === 'spouse' && (r.from_person_id === id || r.to_person_id === id)).map(r => r.from_person_id === id ? r.to_person_id : r.from_person_id)

  const parents  = parentsOf(personId)
  const children = childrenOf(personId)
  const spouses  = spousesOf(personId)

  // Close family
  parents.forEach(id  => close.add(id))
  children.forEach(id => close.add(id))
  spouses.forEach(id  => close.add(id))
  // Siblings = other children of the same parents
  for (const pid of parents) {
    childrenOf(pid).filter(id => id !== personId).forEach(id => close.add(id))
  }

  // Extended family (excluding anyone already in close)
  const addExtended = (id: string) => { if (!close.has(id) && id !== personId) extended.add(id) }

  // Grandparents
  for (const pid of parents) parentsOf(pid).forEach(addExtended)
  // Grandchildren
  for (const cid of children) childrenOf(cid).forEach(addExtended)
  // Spouses of children
  for (const cid of children) spousesOf(cid).forEach(addExtended)
  // Aunts / uncles = siblings of parents
  for (const pid of parents) {
    const grandparents = parentsOf(pid)
    for (const gpid of grandparents) {
      childrenOf(gpid).filter(id => id !== pid).forEach(addExtended)
    }
  }
  // Cousins = children of aunts/uncles
  for (const pid of parents) {
    const grandparents = parentsOf(pid)
    for (const gpid of grandparents) {
      const auntsUncles = childrenOf(gpid).filter(id => id !== pid)
      for (const auId of auntsUncles) childrenOf(auId).forEach(addExtended)
    }
  }

  return { close, extended }
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  familyId: string
  userId: string
  onClose: () => void
}

export default function SendInviteModal({ familyId, userId, onClose }: Props) {
  const supabase  = createClient()
  const fileRef   = useRef<HTMLInputElement>(null)

  // Form state
  const [title,      setTitle]     = useState('')
  const [eventDate,  setEventDate] = useState('')
  const [location,   setLocation]  = useState('')
  const [message,    setMessage]   = useState('')
  const [attachment, setAttachment]= useState<File | null>(null)

  // Recipient state
  const [allRecipients, setAllRecipients]   = useState<Recipient[]>([])
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [closeIds,   setCloseIds]   = useState<Set<string>>(new Set())
  const [extendedIds, setExtendedIds] = useState<Set<string>>(new Set())
  const [loading,    setLoading]   = useState(true)
  const [sending,    setSending]   = useState(false)
  const [error,      setError]     = useState<string | null>(null)
  const [sent,       setSent]      = useState(false)

  // ── load recipients on mount ───────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true)

      const [{ data: people }, { data: rels }] = await Promise.all([
        supabase.from('people').select('id, first_name, last_name, email, linked_user_id').eq('family_id', familyId),
        supabase.from('relationships').select('type, from_person_id, to_person_id').eq('family_id', familyId),
      ])

      if (!people) { setLoading(false); return }

      // Build recipient list: anyone with an email, excluding the sender
      const recipients: Recipient[] = []
      for (const p of people) {
        if (!p.email) continue
        // Exclude the sender (matched via linked_user_id)
        if (p.linked_user_id === userId) continue
        recipients.push({ personId: p.id, name: fullName(p), email: p.email })
      }

      setAllRecipients(recipients)

      // Find current user's person and compute relationship groups
      const myPerson = people.find((p) => p.linked_user_id === userId)
      if (myPerson && rels) {
        const { close, extended } = buildRelativeGroups(myPerson.id, rels as Relationship[])
        setCloseIds(close)
        setExtendedIds(extended)
        // Default: select close family
        const defaultSelected = new Set(
          recipients.filter((r) => close.has(r.personId)).map((r) => r.email)
        )
        setSelectedEmails(defaultSelected)
      } else {
        // Fallback: select everyone
        setSelectedEmails(new Set(recipients.map((r) => r.email)))
      }

      setLoading(false)
    }
    load()
  }, [familyId, userId])

  // ── handlers ──────────────────────────────────────────────────────────────

  function toggleEmail(email: string) {
    setSelectedEmails((prev) => {
      const next = new Set(prev)
      next.has(email) ? next.delete(email) : next.add(email)
      return next
    })
  }

  function toggleAll() {
    if (selectedEmails.size === allRecipients.length) {
      setSelectedEmails(new Set())
    } else {
      setSelectedEmails(new Set(allRecipients.map((r) => r.email)))
    }
  }

  /** Quick-select a named group of recipients */
  function selectGroup(group: 'close' | 'extended' | 'all') {
    if (group === 'close') {
      setSelectedEmails(new Set(allRecipients.filter(r => closeIds.has(r.personId)).map(r => r.email)))
    } else if (group === 'extended') {
      // Extended includes close + extended relatives
      const both = new Set([...closeIds, ...extendedIds])
      setSelectedEmails(new Set(allRecipients.filter(r => both.has(r.personId)).map(r => r.email)))
    } else {
      setSelectedEmails(new Set(allRecipients.map(r => r.email)))
    }
  }

  /** Which group chip is currently active (best-effort) */
  function activeGroup(): 'close' | 'extended' | 'all' | null {
    const both = new Set([...closeIds, ...extendedIds])
    const closeEmails    = new Set(allRecipients.filter(r => closeIds.has(r.personId)).map(r => r.email))
    const extendedEmails = new Set(allRecipients.filter(r => both.has(r.personId)).map(r => r.email))
    const allEmails      = new Set(allRecipients.map(r => r.email))
    const setsEqual = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(v => b.has(v))
    if (setsEqual(selectedEmails, allEmails))      return 'all'
    if (setsEqual(selectedEmails, extendedEmails)) return 'extended'
    if (setsEqual(selectedEmails, closeEmails))    return 'close'
    return null
  }

  async function handleSend() {
    if (!title.trim()) { setError('Please add a title for the invite.'); return }
    if (selectedEmails.size === 0) { setError('Please select at least one recipient.'); return }
    setSending(true)
    setError(null)

    const fd = new FormData()
    fd.append('family_id', familyId)
    fd.append('title', title.trim())
    fd.append('message', message.trim())
    if (eventDate) fd.append('event_date', eventDate)
    if (location.trim()) fd.append('location', location.trim())
    if (attachment) fd.append('attachment', attachment)
    selectedEmails.forEach((e) => fd.append('emails', e))

    const res  = await fetch('/api/send-invite', { method: 'POST', body: fd })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      setSending(false)
      return
    }

    setSent(true)
    setSending(false)
  }

  // ── success screen ─────────────────────────────────────────────────────────

  if (sent) {
    return (
      <Backdrop onClose={onClose}>
        <div className="flex flex-col items-center gap-4 py-8 px-6 text-center">
          <span className="text-5xl">🎉</span>
          <h2 className="text-xl font-bold text-gray-900">Invites sent!</h2>
          <p className="text-sm text-gray-500">
            Your invite was sent to {selectedEmails.size} {selectedEmails.size === 1 ? 'person' : 'people'}.
          </p>
          <button
            onClick={onClose}
            className="mt-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Done
          </button>
        </div>
      </Backdrop>
    )
  }

  // ── compose screen ─────────────────────────────────────────────────────────

  const inputCls = 'w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-gray-400'

  return (
    <Backdrop onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Send Event Invite</h2>
          <p className="text-xs text-gray-400 mt-0.5">Email family members about an upcoming event</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            Event title <span className="text-rose-400">*</span>
          </label>
          <input
            autoFocus
            placeholder="e.g. Govind's Birthday Party"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Date + Location */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Date</label>
            <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Location</label>
            <input placeholder="e.g. 123 Main St" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Message</label>
          <textarea
            rows={4}
            placeholder="Write a note to your family…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Attachment */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Attachment</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
          />
          {attachment ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <Paperclip size={14} />
              <span className="truncate flex-1">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="text-amber-400 hover:text-amber-700 shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors w-full justify-center"
            >
              <Paperclip size={14} /> Attach image or PDF
            </button>
          )}
        </div>

        {/* Recipients */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Recipients
          </label>

          {/* Quick-select group chips */}
          {!loading && allRecipients.length > 0 && (() => {
            const active = activeGroup()
            const chipCls = (g: typeof active) =>
              `px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                active === g
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-600'
              }`
            const closeCount    = allRecipients.filter(r => closeIds.has(r.personId)).length
            const extCount      = allRecipients.filter(r => closeIds.has(r.personId) || extendedIds.has(r.personId)).length
            return (
              <div className="flex flex-wrap gap-2 mb-3">
                <button className={chipCls('close')}    onClick={() => selectGroup('close')}>
                  Close family {closeCount > 0 && `(${closeCount})`}
                </button>
                {extCount > closeCount && (
                  <button className={chipCls('extended')} onClick={() => selectGroup('extended')}>
                    Extended family {`(${extCount})`}
                  </button>
                )}
                <button className={chipCls('all')}      onClick={() => selectGroup('all')}>
                  All members ({allRecipients.length})
                </button>
              </div>
            )
          })()}

          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading members…
            </div>
          ) : allRecipients.length === 0 ? (
            <p className="text-sm text-gray-400 py-3 text-center">
              No family members with email addresses found. Invite members first.
            </p>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {allRecipients.map((r) => {
                const checked = selectedEmails.has(r.email)
                return (
                  <label
                    key={r.email}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      checked ? 'bg-amber-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEmail(r.email)}
                      className="accent-amber-500 w-4 h-4 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                      <p className="text-xs text-gray-400 truncate">{r.email}</p>
                    </div>
                    {checked && (
                      <span className="ml-auto text-[10px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                        invited
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
          {!loading && allRecipients.length > 0 && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              {selectedEmails.size} of {allRecipients.length} selected
            </p>
          )}
        </div>

        {error && <p className="text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={sending || loading}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {sending ? (
            <><Loader2 size={14} className="animate-spin" /> Sending…</>
          ) : (
            <><Send size={14} /> Send event invite</>
          )}
        </button>
      </div>
    </Backdrop>
  )
}

// ── Backdrop ──────────────────────────────────────────────────────────────────

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {children}
      </div>
    </div>
  )
}
