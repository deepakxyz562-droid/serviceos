import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/support/stats — Dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';

    if (isSuperAdmin) {
      // Super-admin: platform-wide stats
      const [open, inProgress, waitingCustomer, resolved, closed, total, categories, announcements] = await Promise.all([
        db.supportTicket.count({ where: { status: 'open' } }),
        db.supportTicket.count({ where: { status: 'in_progress' } }),
        db.supportTicket.count({ where: { status: 'waiting_customer' } }),
        db.supportTicket.count({ where: { status: 'resolved' } }),
        db.supportTicket.count({ where: { status: 'closed' } }),
        db.supportTicket.count(),
        db.supportCategory.count({ where: { isActive: true } }),
        db.announcement.count({ where: { status: 'published' } }),
      ]);

      // Urgent tickets
      const urgent = await db.supportTicket.count({ where: { priority: 'urgent', status: { in: ['open', 'in_progress'] } } });

      // Unassigned tickets
      const unassigned = await db.supportTicket.count({ where: { assigneeId: null, status: { in: ['open', 'in_progress'] } } });

      return NextResponse.json({
        tickets: { open, inProgress, waitingCustomer, resolved, closed, total, urgent, unassigned },
        categories,
        announcements,
      });
    } else {
      // Tenant user: their own ticket stats
      const where = { reporterId: user.id, tenantId: user.tenantId };

      const [open, inProgress, waitingCustomer, resolved, closed, total] = await Promise.all([
        db.supportTicket.count({ where: { ...where, status: 'open' } }),
        db.supportTicket.count({ where: { ...where, status: 'in_progress' } }),
        db.supportTicket.count({ where: { ...where, status: 'waiting_customer' } }),
        db.supportTicket.count({ where: { ...where, status: 'resolved' } }),
        db.supportTicket.count({ where: { ...where, status: 'closed' } }),
        db.supportTicket.count({ where }),
      ]);

      return NextResponse.json({
        tickets: { open, inProgress, waitingCustomer, resolved, closed, total },
      });
    }
  } catch (error) {
    console.error('Error fetching support stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
