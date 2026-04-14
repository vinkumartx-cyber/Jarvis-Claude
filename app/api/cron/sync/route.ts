import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncParentSquare } from '@/lib/parentsquare'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vercel cron job — runs every hour
// Protected by CRON_SECRET env var
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, any> = {}

  try {
    // Get all users with active connections
    const { data: connections } = await supabase
      .from('accounts')
      .select('user_id, service')
      .eq('is_active', true)

    if (!connections?.length) {
      return NextResponse.json({ message: 'No active connections', synced: 0 })
    }

    // Group by user
    const userServiceMap: Record<string, string[]> = {}
    for (const conn of connections) {
      if (!userServiceMap[conn.user_id]) userServiceMap[conn.user_id] = []
      userServiceMap[conn.user_id].push(conn.service)
    }

    // Sync each user's services
    for (const [userId, services] of Object.entries(userServiceMap)) {
      results[userId] = {}

      if (services.includes('parentsquare')) {
        const psResult = await syncParentSquare(userId)
        results[userId].parentsquare = psResult
      }

      // Google sync (Gmail + Calendar) is handled on-demand via OAuth
      // QuickBooks, Twilio, ElevenLabs are pull-only — no background sync needed
    }

    // Log overall cron run
    await supabase.from('sync_logs').insert({
      user_id: 'system',
      service: 'cron',
      status: 'success',
      items_synced: connections.length,
      metadata: { users: Object.keys(userServiceMap).length, timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    console.error('Cron sync error:', err)
    await supabase.from('sync_logs').insert({
      user_id: 'system',
      service: 'cron',
      status: 'error',
      items_synced: 0,
      metadata: { error: err.message },
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
