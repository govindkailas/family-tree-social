import { createServerClient } from '@/lib/supabase/server'
import PeopleSearch from '@/components/PeopleSearch'
import SendInviteButton from '@/components/SendInviteButton'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id, role, families(name)')
    .eq('user_id', user?.id)
    .single()

  const rawFamilies = membership?.families
  const familyName = Array.isArray(rawFamilies)
    ? (rawFamilies as { name: string }[])[0]?.name ?? null
    : (rawFamilies as unknown as { name: string } | null)?.name ?? null
  const familyId = membership?.family_id ?? null
  const isOwner  = membership?.role === 'owner'

  // Count pending join requests (owners only)
  let pendingCount = 0
  if (isOwner && familyId) {
    const { count } = await supabase
      .from('join_requests')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', familyId)
      .eq('status', 'pending')
    pendingCount = count ?? 0
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-0 flex items-center justify-between h-14 shrink-0">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">🌳</span>
            <div className="flex flex-col leading-none">
              <span className="font-semibold text-gray-900 text-sm">
                {familyName ? `${familyName} Family` : 'Family Tree'}
              </span>
              {familyName && <span className="text-[10px] text-gray-400 uppercase tracking-widest">Family Tree</span>}
            </div>
          </Link>
          {familyName && (
            <nav className="flex items-center gap-1">
              <Link
                href="/dashboard/people/new"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                + Add Person
              </Link>
              <Link
                href="/dashboard/invite"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                Invite
              </Link>
              {isOwner && (
                <>
                  <Link
                    href="/dashboard/members"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    Members
                  </Link>
                  <Link
                    href="/dashboard/pending"
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    Requests
                    {pendingCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
              {familyId && user && (
                <SendInviteButton familyId={familyId} userId={user.id} />
              )}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          {membership?.family_id && <PeopleSearch familyId={membership.family_id} />}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
