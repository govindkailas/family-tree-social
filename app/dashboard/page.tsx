import { createServerClient } from '@/lib/supabase/server'
import FamilyTree from '@/components/FamilyTree'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg">You aren't part of any family yet. Ask the family owner to invite you.</p>
      </div>
    )
  }

  const { data: people } = await supabase
    .from('people')
    .select('*')
    .eq('family_id', membership.family_id)

  const { data: relationships } = await supabase
    .from('relationships')
    .select('*')
    .eq('family_id', membership.family_id)

  return (
    <div className="w-full h-full">
      <FamilyTree people={people ?? []} relationships={relationships ?? []} />
    </div>
  )
}
