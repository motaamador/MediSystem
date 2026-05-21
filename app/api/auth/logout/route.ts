import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  // Sign out the user (this clears the cookies/session on the server side)
  await supabase.auth.signOut()

  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')

  const loginUrl = new URL('/login', request.url)
  if (error) {
    loginUrl.searchParams.set('error', error)
  }

  return NextResponse.redirect(loginUrl)
}
