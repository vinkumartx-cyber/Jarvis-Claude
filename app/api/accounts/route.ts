import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
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

    // Fetch all accounts for user
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, type, email, is_active, created_at')
      .eq('user_id', userId);

    if (error) throw error;

    // Mask sensitive data - show only last 4 chars of tokens (which aren't returned here anyway)
    const maskedAccounts = (accounts || []).map((account) => ({
      ...account,
      // Access token would be masked if included
      accessTokenMask: '****',
      refreshTokenMask: '****',
    }));

    return NextResponse.json({
      accounts: maskedAccounts,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify ownership - fetch account and check user_id
    const { data: account, error: fetchError } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('id', accountId)
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete account
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
