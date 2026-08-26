import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateSlug, getAppUrl } from '@/lib/auth';
import { authLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { issueVerificationToken, sendVerificationEmail } from '@/lib/emails/verification-email';

export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(authLimiter, request);
  if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

  try {
    const body = await request.json();
    const { name, email, password, businessName, industry, phone } = body;

    // Validate required fields
    if (!name || !email || !password || !businessName) {
      return NextResponse.json(
        { error: 'Name, email, password, and business name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Generate unique slug from business name
    const baseSlug = generateSlug(businessName);
    let slug = baseSlug;
    let slugCounter = 1;
    while (await db.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create tenant first
    // marketplaceOptIn defaults to true so every new business is listed on
    // the marketplace browse grid immediately (users can toggle it off from
    // Settings → Public Hub → Marketplace listing). This fixes the issue
    // where previously-registered users with a public Business Hub page were
    // invisible on the marketplace because the flag was never set.
    //
    // claimed=true + listingTier='claimed' mark this as a real registered
    // business (vs. seed/demo data which has claimed=false). These flags drive
    // the marketplace card rendering: claimed providers with a valid
    // subscription render as "normal-full" cards (with Book Now / Get Quote /
    // services). Unclaimed or expired-trial providers render as "normal-minimal"
    // cards (name / phone / rating / "Call Now" only).
    //
    // signupMode='crm_trial' distinguishes this from a marketplace-only claim
    // (signupMode='listing_only', listingTier='claimed_free'). CRM tenants get
    // the full sidebar; listing-only tenants get a minimal sidebar. Previously
    // this field was left NULL, which made CRM tenants look like "legacy /
    // undecided" tenants and broke downstream filters that check
    // signupMode === 'crm_trial'.
    const tenant = await db.tenant.create({
      data: {
        name: businessName,
        slug,
        industry: industry || null,
        phone: phone || null,
        email,
        plan: 'starter',
        planStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        marketplaceOptIn: true,
        marketplaceTermsAcceptedAt: new Date(),
        claimed: true,
        listingTier: 'claimed',
        signupMode: 'crm_trial',
      },
    });

    // Create workspace linked to tenant
    const workspace = await db.workspace.create({
      data: {
        name: `${businessName} Workspace`,
        slug: `${slug}-workspace`,
        industry: industry || null,
        ownerId: '', // Will update after user creation
        tenantId: tenant.id,
      },
    });

    // Create user
    // emailVerified=false — the user must click the verification link in the
    // email before they can log in (see /api/auth/login gate). Google OAuth
    // and employee-invitation flows bypass this (they auto-verify elsewhere).
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null,
        role: 'owner',
        authProvider: 'email',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        emailVerified: false,
      },
    });

    // Update workspace with correct ownerId
    await db.workspace.update({
      where: { id: workspace.id },
      data: { ownerId: user.id },
    });

    // Create default subscription (starter plan, trial status, 14-day trial)
    // GUARD: only create if no subscription already exists for this tenant.
    // Previously this always called .create(), which could produce duplicate
    // subscription rows if register was called twice (e.g. user retried after
    // a network error, or Google OAuth flow re-entered this path). The plan
    // picked during onboarding is written via /api/subscriptions POST, which
    // now upserts instead of creating a new row.
    const existingSub = await db.subscription.findFirst({
      where: { tenantId: tenant.id },
    });
    if (!existingSub) {
      await db.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: 'starter',
          status: 'trial',
          amount: 0,
          currency: 'USD',
          billingCycle: 'monthly',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          maxUsers: 1,
          maxJobs: 200,
          maxWorkflows: 10,
          featuresJson: JSON.stringify({
            // WhatsApp is NOT platform-provided. It is BYO (user connects own
            // Meta API). The whatsappIntegration flag gates the menu's
            // visibility, but the actual sending requires a user-connected
            // CommunicationProvider. See Issue 5.
            whatsappIntegration: false,
            customWorkflows: false,
            apiAccess: false,
            prioritySupport: false,
          }),
          // Trial credit system defaults — platform no longer provides WhatsApp
          // so there are no trial WhatsApp credits. Email + SMS + Push are the
          // platform-provided channels. WhatsApp unlocks when the user upgrades
          // to a paid plan AND connects their own Meta API.
          trialWhatsappCredits: 0,
          trialWhatsappUsed: 0,
          platformWhatsappEnabled: false,
          ownWhatsappConnected: false,
          ownEmailProviderConnected: false,
        },
      });
    } else {
      console.log('[Register] Subscription already exists for tenant', tenant.id, '— skipping create');
    }

    // Auto-import notification WhatsApp templates for the new tenant
    // (New Job Assigned, Technician Assigned, On The Way, Job Completed, Service Completed)
    try {
      const { autoImportNotificationTemplates } = await import('@/lib/auto-import-templates')
      await autoImportNotificationTemplates(tenant.id, workspace.id, businessName)
    } catch (importErr) {
      console.warn('[Register] Failed to auto-import notification templates:', importErr)
      // Non-blocking — user can import manually later
    }

    // Auto-seed dummy public business hub data so the new tenant has a
    // starting point they can edit from Settings → Public Hub. This populates
    // the public profile (tagline, description, hours, FAQs, gallery),
    // 4 demo services, and 5 demo reviews — all industry-aware. The tenant
    // can edit or delete any of this from their dashboard.
    try {
      const { seedPublicBusinessForTenant } = await import('@/lib/seed-public-business')
      await seedPublicBusinessForTenant({
        tenantId: tenant.id,
        industry: tenant.industry || undefined,
        city: tenant.city || undefined,
        state: tenant.state || undefined,
      })
      console.log(`[Register] Auto-seeded public hub for tenant ${tenant.id}`)
    } catch (seedErr) {
      console.warn('[Register] Failed to auto-seed public business hub:', seedErr)
      // Non-blocking — tenant can seed manually from Settings → Public Hub
    }

    // ── Email verification ────────────────────────────────────────────────
    // Issue a verification token (hash stored on the User row) and send the
    // email. The user must click the link before they can log in.
    //
    // We do NOT auto-login the user here (no JWT cookie set). The frontend
    // will show a "Check your email" screen and redirect to /login.
    const appUrl = getAppUrl(request);
    try {
      const rawToken = await issueVerificationToken(user.id);
      await sendVerificationEmail({
        to: email,
        name: user.name,
        rawToken,
        appUrl,
      });
    } catch (verifyErr) {
      // Non-blocking — the user can request a resend from the login page.
      // We still return success because the account was created successfully;
      // the user just needs to trigger a resend if the initial email failed.
      console.warn('[Register] Failed to send verification email:', verifyErr);
    }

    // ── Welcome email + superadmin notification + EventBus events ─────────
    // All three are non-blocking — wrapped in try/catch so a failure here
    // doesn't fail the registration (the account is already created).
    try {
      // 1. Send welcome email to the new owner (onboarding checklist).
      const { sendWelcomeEmailTo } = await import('@/lib/emails/welcome-email');
      await sendWelcomeEmailTo(email, {
        ownerName: user.name,
        businessName: tenant.name,
        appUrl,
        tenantSlug: tenant.slug,
        marketplaceOptIn: tenant.marketplaceOptIn,
      });
    } catch (welcomeErr) {
      console.warn('[Register] Failed to send welcome email:', welcomeErr);
    }

    try {
      // 2. Create in-app Notification rows for every superadmin so they see
      //    "New business registered" in their dashboard. We do NOT email
      //    superadmins here (too noisy at scale) — in-app only per the
      //    agreed scope.
      const superadmins = await db.user.findMany({
        where: { isSuperAdmin: true, isActive: true },
        select: { id: true },
      });
      if (superadmins.length > 0) {
        await db.notification.createMany({
          data: superadmins.map((admin) => ({
            userId: admin.id,
            tenantId: tenant.id, // link to the new tenant for one-click navigation
            title: 'New business registered',
            message: `${tenant.name} (${email}) just signed up for a 14-day trial.`,
            type: 'info',
          })),
        });
      }
    } catch (notifErr) {
      console.warn('[Register] Failed to create superadmin notifications:', notifErr);
    }

    try {
      // 3. Emit EventBus events so the trigger system (and any future
      //    subscribers) can react. 'user.registered' and 'tenant.created'
      //    are now in the ServiceEvent type union (see event-bus.ts).
      const { EventBus } = await import('@/lib/event-bus');
      await EventBus.emit(
        'tenant.created',
        {
          tenantId: tenant.id,
          businessName: tenant.name,
          ownerEmail: email,
          ownerName: user.name,
          signupMode: tenant.signupMode,
          plan: tenant.plan,
        },
        { tenantId: tenant.id },
      );
      await EventBus.emit(
        'user.registered',
        {
          userId: user.id,
          email,
          name: user.name,
          role: user.role,
          tenantId: tenant.id,
        },
        { tenantId: tenant.id },
      );
    } catch (emitErr) {
      console.warn('[Register] Failed to emit registration events:', emitErr);
    }

    // Build response — NO token, NO cookie. The user must verify + log in.
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          tenantId: user.tenantId,
          workspaceId: user.workspaceId,
          avatar: user.avatar,
          emailVerified: false,
        },
        emailVerificationRequired: true,
        message: 'Account created. Check your email for a verification link to activate your account.',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          industry: tenant.industry,
          phone: tenant.phone,
          email: tenant.email,
          plan: tenant.plan,
          planStatus: tenant.planStatus,
          trialEndsAt: tenant.trialEndsAt,
          onboardingCompleted: tenant.onboardingCompleted,
          onboardingStep: tenant.onboardingStep,
          listingTier: tenant.listingTier,
          signupMode: tenant.signupMode,
        },
      },
      { status: 201 }
    );

    // Intentionally do NOT set the auth cookie — the user must verify their
    // email and then log in. This prevents unverified users from accessing
    // the dashboard.
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
