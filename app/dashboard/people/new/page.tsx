'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SocialLinksEditor from '@/components/SocialLinksEditor'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type SocialLink = { platform: string; url: string; label?: string }

export default function AddPersonPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nickName, setNickName] = useState('')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [bio, setBio] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user?.id)
      .single()

    if (!membership) {
      alert('You must be a member of a family')
      setSaving(false)
      return
    }

    await supabase.from('people').insert({
      family_id: membership.family_id,
      first_name: firstName,
      last_name: lastName,
      nick_name: nickName || null,
      email: email.trim() || null,
      birth_date: birthDate || null,
      bio: bio || null,
      social_links: socialLinks,
      created_by: user?.id,
    })

    router.push('/dashboard')
  }

  const inputClass =
    'w-full border border-gray-200 bg-gray-50 focus:bg-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-gray-400'

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> Back to tree
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Family Member</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in what you know — you can always update it later.
        </p>
      </div>

      <form onSubmit={addPerson} className="space-y-5">
        {/* Name */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Name
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">First name *</label>
              <input
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Last name</label>
              <input
                placeholder="Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nickname</label>
            <input
              placeholder='e.g. "Grandma Rose"'
              value={nickName}
              onChange={(e) => setNickName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Contact</h2>
            <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              Required for event invites
            </span>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email address *</label>
            <input
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Details
          </h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date of birth</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Bio</label>
            <textarea
              placeholder="A few words about this person…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`${inputClass} resize-none`}
              rows={3}
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Social profiles
          </h2>
          <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gray-900 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add to family tree'}
        </button>
      </form>
    </div>
  )
}
