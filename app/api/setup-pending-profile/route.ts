import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { firstName, lastName, parentId } = await req.json()
    if (!firstName?.trim()) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }

    // Get the family_id from the user's own join_request (RLS-protected — only their own)
    const { data: request } = await supabase
      .from('join_requests')
      .select('family_id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!request?.family_id) {
      return NextResponse.json({ error: 'No pending join request found' }, { status: 404 })
    }
    if (request.status === 'rejected') {
      return NextResponse.json({ error: 'Your request was rejected' }, { status: 403 })
    }

    // Create the people record + optional parent relationship via security-definer RPC
    const { data: personId, error: rpcErr } = await supabase.rpc('submit_pending_profile', {
      p_user_id:    user.id,
      p_family_id:  request.family_id,
      p_email:      user.email ?? '',
      p_first_name: firstName.trim(),
      p_last_name:  lastName?.trim() ?? '',
      p_parent_id:  parentId ?? null,
    })

    if (rpcErr) {
      console.error('[setup-pending-profile] RPC error:', rpcErr.message)
      return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, personId })
  } catch (err: any) {
    console.error('[setup-pending-profile]', err)
    return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
