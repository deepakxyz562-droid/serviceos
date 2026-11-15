import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { IdentityService } from '@/lib/nimo/identity.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const identity = await IdentityService.getIdentityAlbum(user.id);

    return NextResponse.json({
      success: true,
      data: identity,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch identity album' },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const { photoUrls } = body;

    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least 1 photo URL is required (5-10 recommended)' },
        { status: 400 }
      );
    }

    const updated = await IdentityService.saveIdentityPhotos(user.id, photoUrls);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save identity photos' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json(
        { success: false, error: 'photoId is required' },
        { status: 400 }
      );
    }

    const success = await IdentityService.removeIdentityPhoto(user.id, photoId);

    return NextResponse.json({
      success,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete identity photo' },
      { status: 400 }
    );
  }
}
