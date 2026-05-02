import { createServerClient } from '@/lib/supabase/server'
import PeopleSearch from '@/components/PeopleSearch'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user?.id)
    .single()

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-bold text-lg">Family Tree</Link>
          <Link href="/dashboard/invite" className="text-sm text-gray-600 hover:text-black">
            Invite
          </Link>
          <Link href="/dashboard/people/new" className="text-sm text-gray-600 hover:text-black">
            Add Person
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {membership?.family_id && <PeopleSearch familyId={membership.family_id} />}
          <span className="text-sm text-gray-500">{user?.email}</span>
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
