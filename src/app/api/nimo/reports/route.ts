import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { getNimoServiceClient } from '@/lib/nimo/supabase';

export async function POST(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const { mediaId, templateId, reason, description } = body;

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Reason is required' },
        { status: 400 }
      );
    }

    const referenceNumber = `REP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const supabase = getNimoServiceClient();
    const { data, error } = await supabase
      .from('content_reports')
      .insert({
        user_id: user.id,
        media_id: mediaId || null,
        template_id: templateId || null,
        reason,
        description: description || '',
        reference_number: referenceNumber,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({
        success: true,
        referenceNumber,
        message: 'Report received and logged for review',
      });
    }

    return NextResponse.json({
      success: true,
      referenceNumber,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit report' },
      { status: 500 }
    );
  }
}
