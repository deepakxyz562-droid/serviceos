import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sign/documents
 * Lists all sign documents for the authenticated tenant.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const documents = await db.signDocument.findMany({
      where: { tenantId: user.tenantId },
      include: {
        signers: { select: { id: true, signerName: true, signerEmail: true, status: true, signingOrder: true } },
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/sign/documents
 * Creates a new sign document (upload + add signers + send).
 *
 * Body:
 *   title, description?, documentUrl, documentHash?
 *   signers: [{ name, email, phone?, signingOrder }]
 *   fields: [{ type, label, pageNumber, xPosition, yPosition, width, height, required }]
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, documentUrl, documentHash, signers, fields } = body;

    if (!title || !documentUrl || !signers?.length) {
      return NextResponse.json(
        { error: 'title, documentUrl, and at least one signer are required' },
        { status: 400 },
      );
    }

    // Create document + signers + fields
    const doc = await db.signDocument.create({
      data: {
        tenantId: user.tenantId,
        title,
        description: description || null,
        documentUrl,
        documentHash: documentHash || null,
        status: 'sent',
        senderId: user.userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        signers: {
          create: signers.map((s: { name: string; email: string; phone?: string; signingOrder?: number }, idx: number) => ({
            signerName: s.name,
            signerEmail: s.email,
            signerPhone: s.phone || null,
            signingOrder: s.signingOrder || idx + 1,
            status: 'pending',
            accessToken: `sign_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`,
          })),
        },
        fields: {
          create: (fields || []).map((f: {
            type: string; label: string; pageNumber: number;
            xPosition: number; yPosition: number; width: number; height: number; required: boolean;
          }) => ({
            type: f.type || 'signature',
            label: f.label || 'Signature',
            pageNumber: f.pageNumber || 1,
            xPosition: f.xPosition || 0.1,
            yPosition: f.yPosition || 0.1,
            width: f.width || 0.3,
            height: f.height || 0.1,
            required: f.required ?? true,
          })),
        },
        auditTrailJson: JSON.stringify([{
          event: 'document_created',
          timestamp: new Date().toISOString(),
          userId: user.userId,
          details: `Document "${title}" created with ${signers.length} signer(s)`,
        }]),
      },
      include: { signers: true, fields: true },
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    console.error('[sign/documents POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
