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

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Fetch total count
    const { count, error: countError } = await supabase
      .from('briefings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;
    const total = count || 0;

    // Fetch paginated briefings
    const { data: briefings, error: dataError } = await supabase
      .from('briefings')
      .select('id, content, generated_at')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (dataError) throw dataError;

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      briefings: briefings || [],
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching briefing history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch briefing history' },
      { status: 500 }
    );
  }
}
