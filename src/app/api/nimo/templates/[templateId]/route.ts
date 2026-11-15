import { NextRequest, NextResponse } from 'next/server';
import { TemplateService } from '@/lib/nimo/template.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    const template = await TemplateService.getTemplateById(templateId);

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch template' },
      { status: 500 }
    );
  }
}
