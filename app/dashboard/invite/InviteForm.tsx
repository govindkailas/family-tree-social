'use client'
import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function InviteForm({ familyId }: { familyId: string }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const res  = await fetch('/api/invite-member', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.trim(), familyId }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.')
      return
    }

    setSuccess(true)
    setEmail('')
    // Refresh the page to update the recent invites list
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
          Email address
        </label>
        <input
          type="email"
          required
          autoFocus
          placeholder="their@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setSuccess(false); setError(null) }}
          className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-gray-400"
        />
      </div>

      {error && (
        <p className="text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          ✓ Invite sent! They'll receive an email with a link to join.
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Sending…</>
        ) : (
          <><Send size={14} /> Send Invite</>
        )}
      </button>
    </form>
  )
}
