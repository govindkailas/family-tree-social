'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  personId: string
  canEdit?: boolean
  initialData: {
    first_name: string
    last_name: string | null
    nick_name: string | null
    email: string | null
    birth_date: string | null
    death_date: string | null
    bio: string | null
  }
}

export default function PersonDetailsEditor({ personId, canEdit = false, initialData }: Props) {
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    first_name: initialData.first_name ?? '',
    last_name:  initialData.last_name  ?? '',
    nick_name:  initialData.nick_name  ?? '',
    email:      initialData.email      ?? '',
    birth_date: initialData.birth_date ?? '',
    death_date: initialData.death_date ?? '',
    bio:        initialData.bio        ?? '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    setSaving(true)
    setError(null)

    const { error: dbErr } = await supabase
      .from('people')
      .update({
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim()  || null,
        nick_name:  form.nick_name.trim()  || null,
        email:      form.email.trim()      || null,
        birth_date: form.birth_date        || null,
        death_date: form.death_date        || null,
        bio:        form.bio.trim()        || null,
      })
      .eq('id', personId)

    setSaving(false)

    if (dbErr) { setError(dbErr.message); return }

    // Reload so the server-rendered header reflects the new name / dates
    window.location.reload()
  }

  function handleCancel() {
    setForm({
      first_name: initialData.first_name ?? '',
      last_name:  initialData.last_name  ?? '',
      nick_name:  initialData.nick_name  ?? '',
      email:      initialData.email      ?? '',
      birth_date: initialData.birth_date ?? '',
      death_date: initialData.death_date ?? '',
      bio:        initialData.bio        ?? '',
    })
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    if (!canEdit) return null
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2 inline-flex items-center gap-1"
      >
        <PencilIcon /> Edit details
      </button>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Name row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            First name <span className="text-rose-400">*</span>
          </label>
          <input
            value={form.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 transition"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Last name
          </label>
          <input
            value={form.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 transition"
          />
        </div>
      </div>

      {/* Nickname */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
          Nickname
        </label>
        <input
          value={form.nick_name}
          onChange={(e) => set('nick_name', e.target.value)}
          placeholder="e.g. Remy"
          className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 transition"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
          Email address
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="jane@example.com"
          className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 transition"
        />
      </div>

      {/* Dates */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Date of birth
          </label>
          <input
            type="date"
            value={form.birth_date}
            onChange={(e) => set('birth_date', e.target.value)}
            className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 transition"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Date of death
          </label>
          <input
            type="date"
            value={form.death_date}
            onChange={(e) => set('death_date', e.target.value)}
            className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 transition"
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
          Bio
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => set('bio', e.target.value)}
          rows={3}
          placeholder="A few words about this person…"
          className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
        />
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
