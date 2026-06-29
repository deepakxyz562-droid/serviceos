import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/support/categories — List categories
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const isSystem = searchParams.get('isSystem');

    const where: Record<string, unknown> = {
      OR: [
        { tenantId: null },   // global categories
        { tenantId: user.tenantId },  // tenant-specific categories
      ],
    };

    if (isActive !== null) where.isActive = isActive === 'true';
    if (isSystem !== null) where.isSystem = isSystem === 'true';

    const categories = await db.supportCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/support/categories — Create a category (super-admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Only admins can create categories' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, description, icon, color, sortOrder, isActive, isSystem, parentId, tenantId } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const category = await db.supportCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || 'FolderOpen',
        color: color || '#0f766e',
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
        isSystem: isSystem ?? false,
        parentId: parentId || null,
        tenantId: tenantId || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

// PUT /api/support/categories — Seed default categories (super-admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Only admins can seed categories' }, { status: 403 });
    }

    const defaultCategories = [
      { name: 'Account & Billing', slug: 'account-billing', icon: 'CreditCard', color: '#0f766e', sortOrder: 1 },
      { name: 'Technical Issues', slug: 'technical-issues', icon: 'Wrench', color: '#dc2626', sortOrder: 2 },
      { name: 'Feature Request', slug: 'feature-request', icon: 'Sparkles', color: '#7c3aed', sortOrder: 3 },
      { name: 'Getting Started', slug: 'getting-started', icon: 'Rocket', color: '#ea580c', sortOrder: 4 },
      { name: 'Integrations', slug: 'integrations', icon: 'Plug', color: '#0891b2', sortOrder: 5 },
      { name: 'WhatsApp & Messaging', slug: 'whatsapp-messaging', icon: 'MessageSquare', color: '#16a34a', sortOrder: 6 },
      { name: 'Jobs & Scheduling', slug: 'jobs-scheduling', icon: 'Briefcase', color: '#4f46e5', sortOrder: 7 },
      { name: 'CRM & Leads', slug: 'crm-leads', icon: 'Target', color: '#be185d', sortOrder: 8 },
      { name: 'Invoices & Payments', slug: 'invoices-payments', icon: 'Receipt', color: '#0d9488', sortOrder: 9 },
      { name: 'Reports & Analytics', slug: 'reports-analytics', icon: 'BarChart3', color: '#6366f1', sortOrder: 10 },
      { name: 'Team Management', slug: 'team-management', icon: 'Users', color: '#059669', sortOrder: 11 },
      { name: 'Security & Privacy', slug: 'security-privacy', icon: 'Shield', color: '#9333ea', sortOrder: 12 },
      { name: 'Mobile App', slug: 'mobile-app', icon: 'Smartphone', color: '#e11d48', sortOrder: 13 },
      { name: 'API & Developer', slug: 'api-developer', icon: 'Code', color: '#0284c7', sortOrder: 14 },
      { name: 'Data Export & Import', slug: 'data-export-import', icon: 'Database', color: '#ca8a04', sortOrder: 15 },
      { name: 'Workflow Automation', slug: 'workflow-automation', icon: 'Workflow', color: '#6d28d9', sortOrder: 16 },
      { name: 'Campaign & Marketing', slug: 'campaign-marketing', icon: 'Megaphone', color: '#db2777', sortOrder: 17 },
      { name: 'General', slug: 'general', icon: 'HelpCircle', color: '#64748b', sortOrder: 18 },
    ];

    let created = 0;
    for (const cat of defaultCategories) {
      try {
        await db.supportCategory.create({
          data: { ...cat, isSystem: true, isActive: true, tenantId: null },
        });
        created++;
      } catch {
        // Skip if already exists (unique slug constraint)
      }
    }

    return NextResponse.json({ message: `Seeded ${created} categories`, created });
  } catch (error) {
    console.error('Error seeding categories:', error);
    return NextResponse.json({ error: 'Failed to seed categories' }, { status: 500 });
  }
}
