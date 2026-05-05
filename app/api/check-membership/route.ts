import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ isMember: false, error: 'No session' }, { status: 401 })
  }

  // Check if user is already an approved family member
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .single()

  if (membership) {
    return NextResponse.json({ isMember: true })
  }

  // Not a member yet — find the family and create a join request
  const { data: family } = await supabase
    .from('families')
    .select('id')
    .limit(1)
    .single()

  if (family) {
    const { data: existing } = await supabase
      .from('join_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('family_id', family.id)
      .single()

    if (!existing) {
      await supabase.from('join_requests').insert({
        user_id:   user.id,
        email:     user.email ?? '',
        family_id: family.id,
        status:    'pending',
      })
    }
  }

  return NextResponse.json({ isMember: false })
}
