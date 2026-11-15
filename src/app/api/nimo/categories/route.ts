import { NextResponse } from 'next/server';
import { TemplateService } from '@/lib/nimo/template.service';

export async function GET() {
  try {
    const categories = await TemplateService.getCategories();
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
