import { db } from '@/lib/db';
import { getTenantBgosEntitlement, type BgosEntitlementResult } from '@/lib/bgos-entitlement';
import { toValidDate } from '@/lib/safe-date';

export interface PhoneVariants {
  rawTrimmed: string;
  cleanDigits: string;
  tenDigits: string;
  countryCodeDigits: string;
  e164: string;
  spacedNational: string;
  variants: string[];
}

export function buildPhoneVariants(rawPhone: string): PhoneVariants {
  const rawTrimmed = rawPhone.trim();
  const cleanDigits = rawTrimmed.replace(/\D/g, '');
  const tenDigits = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
  const countryCodeDigits =
    cleanDigits.length > 10
      ? cleanDigits
      : tenDigits.length === 10
        ? `91${tenDigits}`
        : cleanDigits;
  const e164 = countryCodeDigits ? `+${countryCodeDigits}` : rawTrimmed;
  const spacedNational =
    tenDigits.length === 10
      ? `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`
      : e164;

  const variants = Array.from(
    new Set(
      [rawTrimmed, e164, tenDigits, countryCodeDigits, cleanDigits, spacedNational].filter(
        Boolean,
      ),
    ),
  );

  return {
    rawTrimmed,
    cleanDigits,
    tenDigits,
    countryCodeDigits,
    e164,
    spacedNational,
    variants,
  };
}

export function phonesMatchTrailing(
  candidatePhone: string | null | undefined,
  targetPhone: string,
): boolean {
  if (!candidatePhone) return false;
  const target = buildPhoneVariants(targetPhone);
  const candTrimmed = candidatePhone.trim();
  if (target.variants.includes(candTrimmed)) return true;
  const candDigits = candTrimmed.replace(/\D/g, '');
  if (!candDigits || !target.cleanDigits) return false;
  if (candDigits === target.cleanDigits || candDigits === target.countryCodeDigits) return true;
  if (target.tenDigits.length >= 10 && candDigits.length >= 10) {
    return candDigits.slice(-10) === target.tenDigits;
  }
  return false;
}

export async function findUserByEmailInsensitive(
  rawEmail: string,
  include?: Record<string, unknown>,
): Promise<any | null> {
  const trimmed = rawEmail.trim();
  const lower = trimmed.toLowerCase();
  if (!lower) return null;
  const dbAny = db as any;

  // 1. Direct unique lookups preserve full compatibility with lightweight unit-test mocks
  if (typeof dbAny.user?.findUnique === 'function') {
    const lowerHit = await dbAny.user.findUnique({
      where: { email: lower },
      ...(include ? { include } : {}),
    });
    if (lowerHit) return lowerHit;

    if (trimmed !== lower) {
      const trimmedHit = await dbAny.user.findUnique({
        where: { email: trimmed },
        ...(include ? { include } : {}),
      });
      if (trimmedHit) return trimmedHit;
    }
  }

  // 2. Case-insensitive query via findMany / findFirst
  if (typeof dbAny.user?.findMany === 'function') {
    const matches = await dbAny.user
      .findMany({
        where: { email: { equals: lower, mode: 'insensitive' } },
        ...(include ? { include } : {}),
        take: 10,
      })
      .catch(() => []);
    if (Array.isArray(matches)) {
      const exact = matches.find(
        (u: any) => String(u?.email || '').trim().toLowerCase() === lower,
      );
      if (exact) return exact;
    }
  } else if (typeof dbAny.user?.findFirst === 'function') {
    const first = await dbAny.user
      .findFirst({
        where: { email: { equals: lower, mode: 'insensitive' } },
        ...(include ? { include } : {}),
      })
      .catch(() => null);
    if (first && String(first.email || '').trim().toLowerCase() === lower) {
      return first;
    }
  }

  return null;
}

function isSyntheticEmail(email: string | null | undefined): boolean {
  const lower = String(email || '').trim().toLowerCase();
  return (
    !lower ||
    lower.endsWith('@bgos.fieseros.com') ||
    lower.endsWith('@merchant.bos.local')
  );
}

function getRoleRank(role: string | null | undefined): number {
  switch (String(role || '').trim().toLowerCase()) {
    case 'owner':
      return 3;
    case 'admin':
    case 'manager':
      return 2;
    case 'employee':
    case 'technician':
      return 0;
    default:
      return 1;
  }
}

function getTimestampScore(user: any): number {
  const candidates = [user?.lastLoginAt, user?.lastActivityAt, user?.createdAt];
  let best = 0;
  for (const raw of candidates) {
    const dt = toValidDate(raw);
    if (dt && dt.getTime() > best) {
      best = dt.getTime();
    }
  }
  return best;
}

function scoreTuple(
  user: any,
  entitlement: BgosEntitlementResult | null,
  targetPhone: string,
  firebaseUid?: string,
): number[] {
  const notSuspended = user?.tenant?.suspendedAt ? 0 : 1;
  const entitlementRank =
    entitlement?.entitled && entitlement?.isPaid
      ? 2
      : entitlement?.entitled
        ? 1
        : 0;
  const roleRank = getRoleRank(user?.role);
  const realEmail = isSyntheticEmail(user?.email) ? 0 : 1;
  const onboardingCompleted = user?.tenant?.onboardingCompleted ? 1 : 0;
  const directMatch =
    phonesMatchTrailing(user?.phone, targetPhone) ||
    Boolean(
      firebaseUid &&
        user?.authProvider === 'firebase_phone' &&
        user?.authProviderId === firebaseUid,
    )
      ? 1
      : 0;
  const recentTs = getTimestampScore(user);

  return [
    notSuspended,
    directMatch,
    entitlementRank,
    roleRank,
    realEmail,
    onboardingCompleted,
    recentTs,
  ];
}

function compareTuplesDesc(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export interface RankedPhoneLookupResult {
  user: any | null;
  hasOnlyInactiveMatches: boolean;
}

/**
 * Resolves the highest-priority business user associated with a verified phone
 * number across `User`, `Employee`, `Tenant`, and (as fallback) `SocialAccount`.
 *
 * Prevents an arbitrary `findFirst` hit on a dormant/expired duplicate or
 * `employee` record from shadowing an active entitled workspace `owner`.
 */
export async function resolveBestPhoneUser(options: {
  phoneNumber: string;
  firebaseUid?: string;
  includeSocialFallback?: boolean;
}): Promise<RankedPhoneLookupResult> {
  const { phoneNumber, firebaseUid, includeSocialFallback = true } = options;
  const pv = buildPhoneVariants(phoneNumber);
  const dbAny = db as any;
  const byId = new Map<string, any>();

  const registerCandidate = (candidate: any, attachedTenant?: any) => {
    if (!candidate?.id) return;
    const prev = byId.get(candidate.id);
    if (!prev) {
      byId.set(candidate.id, {
        ...candidate,
        ...(attachedTenant && !candidate.tenant ? { tenant: attachedTenant } : {}),
      });
      return;
    }
    byId.set(candidate.id, {
      ...prev,
      ...candidate,
      tenant: candidate.tenant || prev.tenant || attachedTenant || null,
      workspace: candidate.workspace || prev.workspace || null,
    });
  };

  // 1. Direct User matches (Firebase UID + all phone representations)
  const userOrConditions: Record<string, unknown>[] = [
    ...(firebaseUid ? [{ authProvider: 'firebase_phone', authProviderId: firebaseUid }] : []),
    ...pv.variants.map((v) => ({ phone: v })),
    ...(pv.tenDigits.length >= 10 ? [{ phone: { contains: pv.tenDigits } }] : []),
  ];

  if (typeof dbAny.user?.findMany === 'function') {
    const userMatches = await dbAny.user
      .findMany({
        where: { OR: userOrConditions },
        include: { workspace: true, tenant: true },
        take: 50,
      })
      .catch(() => []);
    for (const u of Array.isArray(userMatches) ? userMatches : []) {
      const uidMatched =
        Boolean(firebaseUid) &&
        u?.authProvider === 'firebase_phone' &&
        u?.authProviderId === firebaseUid;
      if (uidMatched || phonesMatchTrailing(u?.phone, phoneNumber)) {
        registerCandidate(u);
      }
    }
  } else if (typeof dbAny.user?.findFirst === 'function') {
    const firstUser = await dbAny.user
      .findFirst({
        where: { OR: userOrConditions },
        include: { workspace: true, tenant: true },
      })
      .catch(() => null);
    if (firstUser) registerCandidate(firstUser);
  }

  // 2. Employee matches linked to a User
  if (typeof dbAny.employee?.findMany === 'function') {
    const empOrConditions: Record<string, unknown>[] = [
      ...pv.variants.map((v) => ({ phone: v })),
      ...(pv.tenDigits.length >= 10 ? [{ phone: { contains: pv.tenDigits } }] : []),
    ];
    const empMatches = await dbAny.employee
      .findMany({
        where: { OR: empOrConditions },
        take: 25,
      })
      .catch(() => []);
    const matchedEmpUserIds: string[] = [];
    for (const emp of Array.isArray(empMatches) ? empMatches : []) {
      if (!phonesMatchTrailing(emp?.phone, phoneNumber)) continue;
      if (emp?.user) {
        registerCandidate(emp.user);
      } else if (emp?.userId && !byId.has(emp.userId)) {
        matchedEmpUserIds.push(emp.userId);
      }
    }
    if (matchedEmpUserIds.length > 0 && typeof dbAny.user?.findMany === 'function') {
      const linkedUsers = await dbAny.user
        .findMany({
          where: { id: { in: Array.from(new Set(matchedEmpUserIds)) } },
          include: { workspace: true, tenant: true },
        })
        .catch(() => []);
      for (const u of Array.isArray(linkedUsers) ? linkedUsers : []) {
        registerCandidate(u);
      }
    }
  }

  // 3. Tenant matches on phone / whatsappPhone -> pull non-suspended owner/admin users
  if (typeof dbAny.tenant?.findMany === 'function') {
    const tenantOrConditions: Record<string, unknown>[] = [
      ...pv.variants.map((v) => ({ phone: v })),
      ...pv.variants.map((v) => ({ whatsappPhone: v })),
      ...(pv.tenDigits.length >= 10
        ? [{ phone: { contains: pv.tenDigits } }, { whatsappPhone: { contains: pv.tenDigits } }]
        : []),
    ];
    const tenantMatches = await dbAny.tenant
      .findMany({
        where: { OR: tenantOrConditions },
        include: { users: true },
        take: 25,
      })
      .catch(() => []);
    for (const tenant of Array.isArray(tenantMatches) ? tenantMatches : []) {
      if (tenant?.suspendedAt) continue;
      const tenantPhoneMatch =
        phonesMatchTrailing(tenant?.phone, phoneNumber) ||
        phonesMatchTrailing(tenant?.whatsappPhone, phoneNumber);
      if (!tenantPhoneMatch) continue;

      const usersList = Array.isArray(tenant?.users) ? tenant.users : [];
      const ownerUsers = usersList.filter(
        (u: any) =>
          u?.isActive &&
          !u?.isSuperAdmin &&
          u?.role !== 'customer' &&
          (u?.role === 'owner' || u?.role === 'admin'),
      );
      const fallbackUser =
        ownerUsers.length > 0
          ? ownerUsers
          : usersList.filter((u: any) => u?.isActive && !u?.isSuperAdmin && u?.role !== 'customer').slice(0, 1);
      for (const u of fallbackUser) {
        registerCandidate(u, tenant);
      }
    }
  }

  // Filter active vs inactive
  let allCandidates = Array.from(byId.values());
  let eligible = allCandidates.filter(
    (u) => u?.isActive && !u?.isSuperAdmin && u?.role !== 'customer',
  );

  // 4. Google Business metadata fallback only if no active non-suspended match was found
  const hasNonSuspendedEligible = eligible.some((u) => !u?.tenant?.suspendedAt);
  if (
    !hasNonSuspendedEligible &&
    includeSocialFallback &&
    pv.tenDigits.length >= 10 &&
    typeof dbAny.socialAccount?.findMany === 'function'
  ) {
    const socialMatches = await dbAny.socialAccount
      .findMany({
        where: {
          platform: 'googlebusiness',
          metadata: { contains: pv.tenDigits },
        },
        take: 10,
      })
      .catch(() => []);
    const saTenantIds = Array.from(
      new Set(
        (Array.isArray(socialMatches) ? socialMatches : [])
          .map((sa: any) => sa?.tenantId)
          .filter(Boolean),
      ),
    ) as string[];
    if (saTenantIds.length > 0 && typeof dbAny.tenant?.findMany === 'function') {
      const saTenants = await dbAny.tenant
        .findMany({
          where: { id: { in: saTenantIds } },
          include: { users: true },
        })
        .catch(() => []);
      for (const tenant of Array.isArray(saTenants) ? saTenants : []) {
        if (tenant?.suspendedAt) continue;
        const usersList = Array.isArray(tenant?.users) ? tenant.users : [];
        const owners = usersList.filter(
          (u: any) => u?.isActive && !u?.isSuperAdmin && u?.role !== 'customer',
        );
        const preferred =
          owners.find((u: any) => u.role === 'owner') || owners[0] || null;
        if (preferred) registerCandidate(preferred, tenant);
      }
    }
    allCandidates = Array.from(byId.values());
    eligible = allCandidates.filter(
      (u) => u?.isActive && !u?.isSuperAdmin && u?.role !== 'customer',
    );
  }

  const activeNonSuspended = eligible.filter((u) => !u?.tenant?.suspendedAt);
  if (activeNonSuspended.length === 0) {
    const blockedMatch =
      eligible[0] ||
      allCandidates.find(
        (u) => !u?.isActive || u?.isSuperAdmin || u?.role === 'customer' || Boolean(u?.tenant?.suspendedAt),
      );
    return {
      user: blockedMatch || null,
      hasOnlyInactiveMatches: Boolean(blockedMatch),
    };
  }
  eligible = activeNonSuspended;

  if (eligible.length === 1) {
    const only = eligible[0];
    if (!only.workspace && only.workspaceId && typeof dbAny.workspace?.findUnique === 'function') {
      only.workspace = await dbAny.workspace
        .findUnique({ where: { id: only.workspaceId } })
        .catch(() => null);
    } else if (!only.workspace && only.tenantId && typeof dbAny.workspace?.findFirst === 'function') {
      only.workspace = await dbAny.workspace
        .findFirst({ where: { tenantId: only.tenantId } })
        .catch(() => null);
    }
    return { user: only, hasOnlyInactiveMatches: false };
  }

  // Evaluate tenant entitlements in parallel for ranking
  const uniqueTenantIds = Array.from(
    new Set(eligible.map((u) => u?.tenantId).filter(Boolean)),
  ) as string[];
  const entitlementByTenant = new Map<string, BgosEntitlementResult>();
  await Promise.all(
    uniqueTenantIds.map(async (tid) => {
      try {
        const { entitlement } = await getTenantBgosEntitlement(tid);
        entitlementByTenant.set(tid, entitlement);
      } catch {
        // fallback: no entitlement info
      }
    }),
  );

  const ranked = eligible
    .map((candidate) => ({
      candidate,
      tuple: scoreTuple(
        candidate,
        candidate.tenantId ? (entitlementByTenant.get(candidate.tenantId) ?? null) : null,
        phoneNumber,
        firebaseUid,
      ),
    }))
    .sort((a, b) => compareTuplesDesc(a.tuple, b.tuple));

  const winner = ranked[0]?.candidate || null;
  if (winner) {
    if (!winner.workspace && winner.workspaceId && typeof dbAny.workspace?.findUnique === 'function') {
      winner.workspace = await dbAny.workspace
        .findUnique({ where: { id: winner.workspaceId } })
        .catch(() => null);
    } else if (!winner.workspace && winner.tenantId && typeof dbAny.workspace?.findFirst === 'function') {
      winner.workspace = await dbAny.workspace
        .findFirst({ where: { tenantId: winner.tenantId } })
        .catch(() => null);
    }
  }

  return {
    user: winner,
    hasOnlyInactiveMatches: false,
  };
}
