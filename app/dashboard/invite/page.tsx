import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InviteForm from './InviteForm'

function timeAgo(dt: string) {
  const diff  = Date.now() - new Date(dt).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days > 30) return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0)  return `${mins}m ago`
  return 'just now'
}

export default async function InvitePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-3xl mb-3">🔒</p>
        <p className="text-sm text-gray-500">Only family admins can send invites.</p>
      </div>
    )
  }

  const { family_id: familyId } = membership

  // Fetch recent invites (last 50)
  const { data: invites } = await supabase
    .from('family_invites')
    .select('id, invited_email, created_at')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Cross-reference invite emails against join_requests to show status
  const invitedEmails = (invites ?? []).map(i => i.invited_email)
  const { data: joinRequests } = invitedEmails.length > 0
    ? await supabase
        .from('join_requests')
        .select('email, status, id')
        .eq('family_id', familyId)
        .in('email', invitedEmails)
    : { data: [] }

  // Map email → join request info
  type JoinReqInfo = { status: string; id: string }
  const joinRequestMap = new Map<string, JoinReqInfo>(
    (joinRequests ?? []).map(r => [r.email, { status: r.status, id: r.id }])
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Invite to Family Tree</h1>
      <p className="text-sm text-gray-500 mb-8">
        Send an email invitation to someone so they can join the family tree at kailas.family.
      </p>

      {/* Form */}
      <InviteForm familyId={familyId} />

      {/* Recent invites */}
      {(invites ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Recent Invites ({(invites ?? []).length})
          </h2>
          <ul className="space-y-2">
            {(invites ?? []).map(inv => {
              const jr = joinRequestMap.get(inv.invited_email)
              const status = jr?.status ?? null

              return (
                <li
                  key={inv.id}
                  className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.invited_email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Invited {timeAgo(inv.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {status === 'pending' && (
                      <Link
                        href="/dashboard/pending"
                        className="text-xs font-medium px-3 py-1 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                      >
                        Approve →
                      </Link>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      status === 'approved' ? 'bg-green-100 text-green-700' :
                      status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                      status === 'rejected' ? 'bg-red-100 text-red-600' :
                                             'bg-gray-100 text-gray-500'
                    }`}>
                      {status === 'approved' ? 'Joined ✓' :
                       status === 'pending'  ? 'Awaiting approval' :
                       status === 'rejected' ? 'Rejected' :
                                              'Invite sent'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
