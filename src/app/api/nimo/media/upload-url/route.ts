import { NextRequest, NextResponse } from 'next/server';
import { getNimoServiceClient } from '@/lib/nimo/supabase';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { NIMO_CONFIG } from '@/lib/nimo/config';

export async function POST(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const { filename = 'photo.jpg', mimeType = 'image/jpeg' } = body;

    const fileExt = filename.split('.').pop() || 'jpg';
    const uniquePath = `uploads/${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const supabase = getNimoServiceClient();

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from(NIMO_CONFIG.storageBucket)
      .createSignedUploadUrl(uniquePath);

    if (error) {
      // Fallback: public URL or direct presigned url
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${NIMO_CONFIG.storageBucket}/${uniquePath}`;
      return NextResponse.json({
        success: true,
        data: {
          storagePath: uniquePath,
          uploadUrl: publicUrl,
          fileUrl: publicUrl,
          isSigned: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        storagePath: uniquePath,
        signedUrl: data.signedUrl,
        token: data.token,
        fileUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${NIMO_CONFIG.storageBucket}/${uniquePath}`,
        isSigned: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
