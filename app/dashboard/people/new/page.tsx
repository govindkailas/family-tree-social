'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddPersonPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nickName, setNickName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [bio, setBio] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user?.id)
      .single()

    if (!membership) {
      alert('You must be a member of a family')
      return
    }

    await supabase.from('people').insert({
      family_id: membership.family_id,
      first_name: firstName,
      last_name: lastName,
      nick_name: nickName,
      birth_date: birthDate || null,
      bio,
      created_by: user?.id,
    })

    router.push('/dashboard')
  }

  return (
    <div className="max-w-lg mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">Add New Family Member</h1>
      <form onSubmit={addPerson} className="space-y-4">
        <input
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded"
        />
        <input
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <input
          placeholder="Nickname"
          value={nickName}
          onChange={(e) => setNickName(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <textarea
          placeholder="Short bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          rows={3}
        />
        <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded">
          Add Person
        </button>
      </form>
    </div>
  )
}
