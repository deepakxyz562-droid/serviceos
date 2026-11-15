import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { getNimoServiceClient } from '@/lib/nimo/supabase';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const user = await getNimoAuthUser(req);
    const { mediaId } = await params;
    const supabase = getNimoServiceClient();

    // Soft delete
    const { error } = await supabase
      .from('generated_media')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', mediaId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Media removed from gallery' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete media' },
      { status: 500 }
    );
  }
}
