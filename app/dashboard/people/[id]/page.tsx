import { createServerClient } from '@/lib/supabase/server'
import SocialLinksEditorWrapper from './SocialLinksEditorWrapper'

export default async function PersonPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: person } = await supabase
    .from('people')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!person) return <div className="p-8">Person not found.</div>

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold">
        {person.first_name} {person.last_name}
        {person.nick_name && <span className="text-gray-400 ml-2">({person.nick_name})</span>}
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        {person.birth_date && `Born: ${person.birth_date}`}
        {person.death_date && ` · Died: ${person.death_date}`}
      </p>
      <p className="mt-4">{person.bio}</p>
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Social Profiles</h2>
        <SocialLinksEditorWrapper
          personId={person.id}
          initialLinks={person.social_links || []}
        />
      </div>
    </div>
  )
}
