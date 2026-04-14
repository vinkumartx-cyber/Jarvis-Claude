import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { serviceId } = await req.json()
    if (!serviceId) return NextResponse.json({ error: 'serviceId required' }, { status: 400 })

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Mark as inactive rather than hard delete (preserves audit trail)
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false, access_token: null, refresh_token: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('service', serviceId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
