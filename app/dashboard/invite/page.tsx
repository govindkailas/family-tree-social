'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage() {
  const [email, setEmail] = useState('')
  const supabase = createClient()

  const invite = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('user_id', user?.id)
      .single()

    if (membership?.role !== 'owner') {
      alert('Only the family owner can invite')
      return
    }

    await supabase.from('family_members').insert({
      family_id: membership.family_id,
      email,
      role: 'member',
      approved: false,
    })
    alert('Invitation sent! The person must sign up with this email and be approved.')
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-lg font-semibold mb-3">Invite Family Member</h1>
      <input
        type="email"
        placeholder="their@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border px-3 py-2 rounded mb-2"
      />
      <button onClick={invite} className="bg-gray-900 text-white px-4 py-2 rounded">
        Invite
      </button>
      <p className="text-sm text-gray-500 mt-4">
        They will need to sign up with this email, then you can approve them in the family admin panel.
      </p>
    </div>
  )
}
