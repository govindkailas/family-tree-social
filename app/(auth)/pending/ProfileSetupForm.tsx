'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Person = { id: string; first_name: string; last_name: string }

export default function ProfileSetupForm({ people }: { people: Person[] }) {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [parentId,  setParentId]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [done,      setDone]      = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim()) { setError('Please enter your first name.'); return }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/setup-pending-profile', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        firstName,
        lastName,
        parentId: parentId || null,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      return
    }

    setDone(true)
    // Refresh the server component so it picks up the new people record
    // and shows the treeContext confirmation instead of this form
    router.refresh()
  }

  if (done) {
    return (
      <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        ✓ Profile saved! The admin will be notified.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <p className="text-sm text-gray-500 text-center">
        Tell us a bit about yourself so the admin can place you in the tree.
      </p>

      {/* Name row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            First name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="e.g. Priya"
            required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Last name</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="e.g. Kailathu"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Parent picker */}
      {people.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Who is your parent in the tree?
          </label>
          <select
            value={parentId}
            onChange={e => setParentId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white text-gray-700"
          >
            <option value="">— Select a parent (optional) —</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>
                {p.first_name}{p.last_name ? ` ${p.last_name}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Saving…' : 'Save my profile'}
      </button>
    </form>
  )
}
