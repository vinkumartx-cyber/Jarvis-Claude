import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { syncGmailAccount, syncCalendarAccount, syncTasksAccount } from '@/lib/sync';

function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const supabase = createServerClient();

    // Fetch all active accounts for user
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (accountsError) throw accountsError;

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        synced: {
          calendar: 0,
          emails: 0,
          tasks: 0,
        },
      });
    }

    let calendarCount = 0;
    let emailsCount = 0;
    let tasksCount = 0;

    // Sync each Google account
    for (const account of accounts) {
      if (account.type === 'google') {
        // Sync Gmail
        const gmailResult = await syncGmailAccount(account, userId);
        emailsCount += gmailResult.itemsSynced;

        // Sync Calendar
        const calendarResult = await syncCalendarAccount(account, userId);
        calendarCount += calendarResult.itemsSynced;

        // Sync Tasks
        const tasksResult = await syncTasksAccount(account, userId);
        tasksCount += tasksResult.itemsSynced;
      }
    }

    return NextResponse.json({
      success: true,
      synced: {
        calendar: calendarCount,
        emails: emailsCount,
        tasks: tasksCount,
      },
    });
  } catch (error) {
    console.error('Error in sync endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to sync accounts' },
      { status: 500 }
    );
  }
}
