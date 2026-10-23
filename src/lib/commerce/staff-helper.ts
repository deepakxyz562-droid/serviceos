import { db } from '@/lib/db';

export type BosStaffRole =
  | 'owner'
  | 'admin'
  | 'biller'
  | 'cashier'
  | 'stock_manager'
  | 'accountant';

export interface BosStaffPermissions {
  canCreateInvoices: boolean;
  canPosBilling: boolean;
  canManageProducts: boolean;
  canViewReports: boolean;
  canManageKhata: boolean;
  canManageSettings: boolean;
  canManageStaff: boolean;
}

export interface BosStaffMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: BosStaffRole;
  permissions: BosStaffPermissions;
  isActive: boolean;
  createdAt: string;
  userId?: string;
}

export function getDefaultPermissionsForRole(role: BosStaffRole): BosStaffPermissions {
  switch (role) {
    case 'owner':
      return {
        canCreateInvoices: true,
        canPosBilling: true,
        canManageProducts: true,
        canViewReports: true,
        canManageKhata: true,
        canManageSettings: true,
        canManageStaff: true,
      };
    case 'admin':
      return {
        canCreateInvoices: true,
        canPosBilling: true,
        canManageProducts: true,
        canViewReports: true,
        canManageKhata: true,
        canManageSettings: true,
        canManageStaff: true,
      };
    case 'biller':
      return {
        canCreateInvoices: true,
        canPosBilling: true,
        canManageProducts: false,
        canViewReports: false,
        canManageKhata: true,
        canManageSettings: false,
        canManageStaff: false,
      };
    case 'cashier':
      return {
        canCreateInvoices: false,
        canPosBilling: true,
        canManageProducts: false,
        canViewReports: false,
        canManageKhata: false,
        canManageSettings: false,
        canManageStaff: false,
      };
    case 'stock_manager':
      return {
        canCreateInvoices: false,
        canPosBilling: false,
        canManageProducts: true,
        canViewReports: false,
        canManageKhata: false,
        canManageSettings: false,
        canManageStaff: false,
      };
    case 'accountant':
      return {
        canCreateInvoices: false,
        canPosBilling: false,
        canManageProducts: false,
        canViewReports: true,
        canManageKhata: true,
        canManageSettings: false,
        canManageStaff: false,
      };
  }
}

export interface ResolvedStaffSession {
  business: any;
  role: BosStaffRole;
  permissions: BosStaffPermissions;
  staffMember?: BosStaffMember;
  isOwner: boolean;
}

/**
 * Resolves business and permissions for a user:
 * 1. Checks if user is owner of an AiBusiness.
 * 2. If not, checks if user is listed as active staff member in any business config.
 */
export async function resolveStaffSession(user: {
  id: string;
  email?: string;
  phone?: string;
}): Promise<ResolvedStaffSession | null> {
  // 1. Direct owner check
  const ownedBusiness = await db.aiBusiness.findUnique({
    where: { ownerId: user.id },
  });

  if (ownedBusiness) {
    return {
      business: ownedBusiness,
      role: 'owner',
      permissions: getDefaultPermissionsForRole('owner'),
      isOwner: true,
    };
  }

  // 2. Staff membership lookup via GptformCommerceConfig.fieldsJson
  const emailNorm = user.email ? user.email.trim().toLowerCase() : '';
  const phoneClean = user.phone ? user.phone.replace(/[^0-9]/g, '') : '';

  const searchConditions: any[] = [{ fieldsJson: { contains: user.id } }];
  if (emailNorm) {
    searchConditions.push({ fieldsJson: { contains: emailNorm } });
  }
  if (phoneClean && phoneClean.length >= 6) {
    searchConditions.push({ fieldsJson: { contains: phoneClean } });
  }

  const configs = await db.gptformCommerceConfig.findMany({
    where: { OR: searchConditions },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  for (const cfg of configs) {
    try {
      const raw = JSON.parse(cfg.fieldsJson || '{}');
      const staffList: BosStaffMember[] = Array.isArray(raw.staffMembers) ? raw.staffMembers : [];
      const match = staffList.find((s) => {
        if (!s.isActive) return false;
        if (s.userId && s.userId === user.id) return true;
        if (emailNorm && s.email && s.email.trim().toLowerCase() === emailNorm) return true;
        if (phoneClean && s.phone && s.phone.replace(/[^0-9]/g, '').endsWith(phoneClean.slice(-10))) return true;
        return false;
      });

      if (match) {
        // Find business for this config
        let business = await db.aiBusiness.findUnique({
          where: { id: cfg.businessId },
        });
        if (!business) {
          business = await db.aiBusiness.findFirst({
            where: {
              OR: [{ id: cfg.businessId }, { tenantId: cfg.businessId }],
            },
          });
        }

        if (business) {
          return {
            business,
            role: match.role || 'biller',
            permissions: match.permissions || getDefaultPermissionsForRole(match.role || 'biller'),
            staffMember: match,
            isOwner: match.role === 'owner',
          };
        }
      }
    } catch {
      // Ignore parse failure on individual config
    }
  }

  return null;
}
