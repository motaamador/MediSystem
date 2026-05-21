import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('Error fetching profile in AppLayout:', error)
    redirect('/api/auth/logout?error=no_profile')
  }

  return (
    <div className="app-layout">
      <Sidebar profile={profile} />
      <main className="main-content">
        <div className="page-content fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
