import { createServerClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const supabase = createServerClient()

  // Uses a security-definer RPC so the family name is readable without auth.
  // Run this once in the Supabase SQL editor if you haven't already:
  //
  //   create or replace function get_public_family_name()
  //   returns text as $$
  //     select name from families order by created_at limit 1;
  //   $$ language sql security definer;
  const { data: familyName } = await supabase.rpc('get_public_family_name')

  return <LoginForm familyName={familyName ?? null} />
}
