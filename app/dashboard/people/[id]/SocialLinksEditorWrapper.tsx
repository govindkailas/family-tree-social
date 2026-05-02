'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SocialLinksEditor from '@/components/SocialLinksEditor'

export default function SocialLinksEditorWrapper({
  personId,
  initialLinks,
}: {
  personId: string
  initialLinks: any[]
}) {
  const [links, setLinks] = useState(initialLinks)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const save = async () => {
    setSaving(true)
    await supabase.from('people').update({ social_links: links }).eq('id', personId)
    setSaving(false)
  }

  return (
    <div>
      <SocialLinksEditor links={links} onChange={setLinks} />
      <button
        onClick={save}
        disabled={saving}
        className="mt-3 bg-gray-900 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
