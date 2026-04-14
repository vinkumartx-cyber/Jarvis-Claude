import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { serviceId, credentials } = await req.json()
    if (!serviceId) return NextResponse.json({ error: 'serviceId required' }, { status: 400 })

    // Get user from DB
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Encode credentials into access_token field (base64 JSON — AES-256 upgrade path later)
    let accessToken: string | null = null
    let identifier = session.user.email || 'connected'
    if (credentials && Object.keys(credentials).length > 0) {
      accessToken = Buffer.from(JSON.stringify(credentials)).toString('base64')
      // Use username as identifier if provided
      if (credentials.username) identifier = credentials.username
    }

    // Upsert into existing accounts table
    const { error } = await supabase.from('accounts').upsert(
      {
        user_id: user.id,
        service: serviceId,
        email_or_identifier: identifier,
        access_token: accessToken,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,service,email_or_identifier' }
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Connection save error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
