'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CreateFamily() {
  const [familyName, setFamilyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    // 1. Create the family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({ name: familyName.trim(), created_by: user.id })
      .select('id')
      .single()

    if (familyError || !family) {
      setError(familyError?.message || 'Failed to create family')
      setLoading(false)
      return
    }

    // 2. Add the user as owner with approved membership
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: family.id,
        user_id: user.id,
        email: user.email,
        role: 'owner',
        approved: true,
        approved_at: new Date().toISOString(),
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      {/* Brand mark */}
      <div className="flex flex-col items-center mb-10">
        <span className="text-5xl mb-4">🌳</span>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Welcome to Family Tree
        </h1>
        <p className="text-gray-500 mt-2 text-center max-w-sm">
          You&apos;re the first here. Give your family tree a name to get started — you can invite others once it&apos;s set up.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">
              Family name
            </label>
            <input
              type="text"
              placeholder='e.g. "The Smiths" or "Wright Family"'
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-200 bg-gray-50 focus:bg-white px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-gray-400"
            />
          </div>

          {/* Preview */}
          {familyName.trim() && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
              <span className="text-xl">🌳</span>
              <div className="leading-none">
                <p className="text-sm font-semibold text-gray-900">
                  {familyName.trim()} Family
                </p>
                <p className="text-[10px] text-amber-600 uppercase tracking-widest mt-0.5">
                  Family Tree
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !familyName.trim()}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create family tree'}
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center max-w-xs">
        You&apos;ll be the owner. Use the Invite option in the header to add other family members.
      </p>
    </div>
  )
}
