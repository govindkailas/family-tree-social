import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import SocialLinksEditorWrapper from './SocialLinksEditorWrapper'
import RelationshipsManager from './RelationshipsManager'
import AvatarUploader from '@/components/AvatarUploader'
import PersonDetailsEditor from './PersonDetailsEditor'

// ── helpers ────────────────────────────────────────────────────────────────

function getInitials(first: string, last?: string | null) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

const PALETTE: [string, string][] = [
  ['#f59e0b', '#fef3c7'],
  ['#10b981', '#d1fae5'],
  ['#3b82f6', '#dbeafe'],
  ['#8b5cf6', '#ede9fe'],
  ['#f43f5e', '#ffe4e6'],
  ['#ea580c', '#ffedd5'],
  ['#0d9488', '#ccfbf1'],
]

function getPalette(seed: string): [string, string] {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff
  return PALETTE[h % PALETTE.length]
}

// ── page ───────────────────────────────────────────────────────────────────

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch person
  const { data: person } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single()

  if (!person) {
    return <div className="p-8 text-gray-500">Person not found.</div>
  }

  // Check if current user is the family owner (affects invite permissions)
  const { data: membership } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', person.family_id)
    .eq('user_id', user.id)
    .single()
  const isOwner = membership?.role === 'owner'

  // Person can edit their own profile (matched by email or user_id)
  const isOwnProfile =
    (person as any).user_id === user.id ||
    (person.email != null && person.email === user.email)

  const canEdit = isOwner || isOwnProfile

  // Fetch all relationships involving this person (with joined person data)
  const { data: relationships } = await supabase
    .from('relationships')
    .select(
      'id, type, from_person_id, to_person_id, from_person:people!from_person_id(id,first_name,last_name,nick_name), to_person:people!to_person_id(id,first_name,last_name,nick_name)'
    )
    .eq('family_id', person.family_id)
    .or(`from_person_id.eq.${id},to_person_id.eq.${id}`)

  // Fetch all other people in the family (for the relationship picker)
  const { data: allPeople } = await supabase
    .from('people')
    .select('id, first_name, last_name, nick_name')
    .eq('family_id', person.family_id)
    .neq('id', id)
    .order('first_name')

  const seed = `${person.first_name ?? ''}${person.last_name ?? ''}`
  const [accent, lightBg] = getPalette(seed)
  const initials = getInitials(person.first_name, person.last_name)

  const birthLabel = person.birth_date
    ? `Born ${new Date(person.birth_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : null
  const deathLabel = person.death_date
    ? `Died ${new Date(person.death_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Back to tree
      </Link>

      {/* Person header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div style={{ background: accent, height: 6 }} />
        <div className="px-6 py-6 flex items-center gap-5">
          <AvatarUploader
            personId={person.id}
            initialAvatarUrl={person.avatar_url ?? null}
            socialLinks={(person.social_links as any[]) ?? []}
            initials={initials}
            accent={accent}
            lightBg={lightBg}
            canEdit={canEdit}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {person.first_name} {person.last_name}
              {person.nick_name && (
                <span className="text-gray-400 font-normal text-lg ml-2">
                  &ldquo;{person.nick_name}&rdquo;
                </span>
              )}
            </h1>
            {(birthLabel || deathLabel) && (
              <p className="text-sm text-gray-500 mt-1">
                {[birthLabel, deathLabel].filter(Boolean).join(' · ')}
              </p>
            )}
            {/* Location + phone */}
            {((person as any).location || (person as any).phone) && (
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                {(person as any).location && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <span>📍</span>{(person as any).location}
                  </p>
                )}
                {(person as any).phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <span>📞</span>{(person as any).phone}
                  </p>
                )}
              </div>
            )}
            {person.bio && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{person.bio}</p>
            )}
            <PersonDetailsEditor
              personId={person.id}
              canEdit={canEdit}
              initialData={{
                first_name: person.first_name,
                last_name:  person.last_name  ?? null,
                nick_name:  person.nick_name  ?? null,
                email:      (person as any).email ?? null,
                birth_date: person.birth_date ?? null,
                death_date: person.death_date ?? null,
                bio:        person.bio        ?? null,
                location:   (person as any).location ?? null,
                phone:      (person as any).phone    ?? null,
              }}
            />
          </div>
        </div>
      </div>

      {/* Relationships */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Relationships
        </h2>
        <RelationshipsManager
          personId={id}
          familyId={person.family_id}
          initialRelationships={(relationships ?? []) as any}
          allPeople={(allPeople ?? []) as any}
          isOwner={isOwner ?? false}
          canEdit={canEdit}
        />
      </section>

      {/* Social links */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Social profiles
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SocialLinksEditorWrapper
            personId={person.id}
            initialLinks={person.social_links ?? []}
          />
        </div>
      </section>
    </div>
  )
}
