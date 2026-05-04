import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
    }

    // Check if user is already an approved family member
    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single()

    if (membership) {
      // Existing member → go straight to dashboard
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    // Not a member yet — find the family and create a join request
    const { data: family } = await supabase
      .from('families')
      .select('id')
      .limit(1)
      .single()

    if (family) {
      // Only insert if no request exists yet (avoid duplicates on re-login)
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

    // Send them to the waiting room
    return NextResponse.redirect(`${origin}/pending`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
