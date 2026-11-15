import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { getNimoServiceClient } from '@/lib/nimo/supabase';

export async function GET(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = getNimoServiceClient();
    const { data, count, error } = await supabase
      .from('generated_media')
      .select('*, templates(title, slug, thumbnail_url)', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { total: 0, page, limit, hasMore: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || (data?.length || 0),
        page,
        limit,
        hasMore: (count || 0) > to + 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gallery creations' },
      { status: 500 }
    );
  }
}
