import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verify requester is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
  }

  // Parse body
  const body = await request.json()
  const { full_name, email, password, employee_code, department, position, phone, role } = body

  if (!full_name || !email || !password) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
  }

  // Create user with admin client
  const adminSupabase = await createAdminClient()
  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: role || 'employee' },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Update profile with additional data
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update({
      full_name,
      employee_code: employee_code || null,
      department: department || null,
      position: position || null,
      phone: phone || null,
      role: role || 'employee',
    })
    .eq('id', newUser.user!.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: newUser.user!.id })
}
