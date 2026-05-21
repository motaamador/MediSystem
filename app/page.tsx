import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('Error fetching profile in HomePage:', error)
    redirect('/api/auth/logout?error=no_profile')
  }

  if (profile.role === 'admin') {
    redirect('/dashboard')
  } else {
    redirect('/attendance')
  }
}
