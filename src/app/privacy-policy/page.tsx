import { Bolt } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ServiceOS CRM",
  description:
    "Learn how ServiceOS CRM collects, uses, and protects your personal information, WhatsApp data, payment details, and business data. Last updated March 5, 2026.",
  openGraph: {
    title: "Privacy Policy — ServiceOS CRM",
    description:
      "Learn how ServiceOS CRM collects, uses, and protects your personal information, WhatsApp data, payment details, and business data.",
    url: "https://serviceos.com/privacy-policy",
    siteName: "ServiceOS",
    type: "website",
  },
};

const sections = [
  { id: "introduction", label: "1. Introduction" },
  { id: "information-we-collect", label: "2. Information We Collect" },
  { id: "how-we-use", label: "3. How We Use Your Information" },
  { id: "how-we-share", label: "4. How We Share Your Information" },
  { id: "data-storage-security", label: "5. Data Storage & Security" },
  { id: "data-retention", label: "6. Data Retention" },
  { id: "your-rights", label: "7. Your Rights" },
  { id: "whatsapp-meta", label: "8. WhatsApp & Meta Integration" },
  { id: "international-transfers", label: "9. International Data Transfers" },
  { id: "childrens-privacy", label: "10. Children's Privacy" },
  { id: "changes", label: "11. Changes to This Policy" },
  { id: "contact", label: "12. Contact Us" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ───── Header ───── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <Bolt className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground">
              ServiceOS
            </span>
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            ← Back to Home
          </a>
        </div>
      </header>

      {/* ───── Body ───── */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="flex gap-10 lg:gap-14">
            {/* ── Sidebar TOC (desktop) ── */}
            <aside className="hidden lg:block w-64 shrink-0">
              <nav
                id="toc-nav"
                className="sticky top-24 space-y-1"
                aria-label="Table of contents"
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  On this page
                </p>
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    data-toc-link={s.id}
                    className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground toc-link"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </aside>

            {/* ── Content ── */}
            <article className="min-w-0 max-w-4xl">
              {/* Title block */}
              <div className="mb-10 border-b pb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                  Privacy Policy
                </h1>
                <p className="mt-3 text-base text-muted-foreground">
                  Last updated:{" "}
                  <span className="font-medium text-foreground">
                    March 5, 2026
                  </span>
                </p>
              </div>

              {/* ───── 1. Introduction ───── */}
              <section id="introduction" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  1. Introduction
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS, Inc. (&quot;ServiceOS,&quot; &quot;we,&quot;
                  &quot;us,&quot; or &quot;our&quot;) operates the ServiceOS CRM
                  platform available at{" "}
                  <a
                    href="https://serviceos.com"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    serviceos.com
                  </a>{" "}
                  and related mobile applications (collectively, the
                  &quot;Service&quot;). This Privacy Policy explains how we
                  collect, use, disclose, and safeguard your information when you
                  use our Service.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  By accessing or using the Service, you agree to the collection
                  and use of information in accordance with this policy. If you do
                  not agree with the terms of this Privacy Policy, please do not
                  access the Service.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  This policy applies to all users of the Service, including
                  business account holders, team members, customer portal users,
                  and visitors to our website. It covers our handling of personal
                  information, business data, WhatsApp communications, payment
                  data, and usage analytics.
                </p>
              </section>

              {/* ───── 2. Information We Collect ───── */}
              <section id="information-we-collect" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  2. Information We Collect
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  2.1 Personal Information
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  When you create an account, subscribe to our Service, or
                  interact with us, we may collect the following personal
                  information:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Full name and display name</li>
                  <li>Email address (personal and business)</li>
                  <li>Phone number (mobile and business)</li>
                  <li>Company name and job title</li>
                  <li>Billing address and tax identification numbers</li>
                  <li>Profile photograph (if provided)</li>
                  <li>Account credentials (hashed passwords)</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  2.2 Business Data
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  As a CRM platform, you entrust us with your business data. This
                  includes, but is not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Customer and contact records (names, emails, phone numbers, addresses)</li>
                  <li>Lead information and sales pipeline data</li>
                  <li>Invoices, quotes, and payment records</li>
                  <li>Booking and appointment data</li>
                  <li>Job assignment and dispatch information</li>
                  <li>Notes, tags, custom fields, and activity history</li>
                  <li>Workflow automation configurations</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  You retain full ownership of your business data. ServiceOS acts
                  as a data processor on your behalf and processes this data only
                  to deliver the Service as instructed by you.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  2.3 WhatsApp Data
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  ServiceOS integrates with the WhatsApp Business API, provided
                  by Meta Platforms, Inc. When you connect your WhatsApp Business
                  account, the following data may be collected and processed:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>WhatsApp Business phone numbers</li>
                  <li>Message content (sent and received via the Service)</li>
                  <li>Message templates and template submission data</li>
                  <li>Conversation metadata (timestamps, delivery status, read receipts)</li>
                  <li>Contact profiles synced from WhatsApp</li>
                  <li>WhatsApp Business account settings and configuration</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  WhatsApp messages are stored temporarily for service delivery
                  and are subject to the data retention settings configured in
                  your account. See Section 8 for details on our Meta integration.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  2.4 Payment Information
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We process subscription payments and invoicing through
                  third-party payment processors:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong>Stripe, Inc.</strong> — for credit/debit card and
                    bank transfer payments
                  </li>
                  <li>
                    <strong>PayPal Holdings, Inc.</strong> — for PayPal wallet
                    payments
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  ServiceOS does <strong>not</strong> collect, store, or have
                  access to your full credit card number, CVV, or bank account
                  details. These are handled entirely by our payment processors
                  who comply with PCI DSS Level 1 certification. We retain only
                  the last four digits of card numbers, card brand, and expiration
                  date for display purposes.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  2.5 Usage Data
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We automatically collect certain information when you access or
                  use the Service:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Device type, operating system, and browser information</li>
                  <li>IP address and approximate geographic location</li>
                  <li>Pages visited, features used, and click patterns</li>
                  <li>Session duration and frequency of use</li>
                  <li>Referral source and search terms</li>
                  <li>Error logs and performance metrics</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  2.6 Cookies &amp; Local Storage
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We use cookies and similar tracking technologies to operate and
                  improve the Service:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-3">
                  <li>
                    <strong>Essential Cookies</strong> — required for
                    authentication, security, and core functionality (e.g.,
                    session tokens, CSRF protection)
                  </li>
                  <li>
                    <strong>Functional Cookies</strong> — remember your
                    preferences and settings (e.g., language, theme, layout)
                  </li>
                  <li>
                    <strong>Analytics Cookies</strong> — help us understand how
                    users interact with the Service (e.g., page views, feature
                    adoption)
                  </li>
                  <li>
                    <strong>Local Storage</strong> — used for offline
                    capabilities, caching, and improving performance of the
                    progressive web app (PWA)
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  You can manage cookie preferences through your browser settings.
                  Disabling essential cookies may affect the functionality of the
                  Service.
                </p>
              </section>

              {/* ───── 3. How We Use Your Information ───── */}
              <section id="how-we-use" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  3. How We Use Your Information
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We use the information we collect for the following purposes:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong>Service Delivery</strong> — to provide, maintain, and
                    improve the ServiceOS CRM platform, including processing your
                    business data, managing customer relationships, and delivering
                    WhatsApp communications
                  </li>
                  <li>
                    <strong>Account Management</strong> — to create and manage
                    your account, authenticate your identity, and provide customer
                    support
                  </li>
                  <li>
                    <strong>Communication</strong> — to send you service-related
                    notifications, billing alerts, security notices, and
                    occasional product updates (you can opt out of marketing
                    communications at any time)
                  </li>
                  <li>
                    <strong>Analytics &amp; Improvement</strong> — to analyze
                    usage patterns, identify bugs, and improve the performance,
                    usability, and features of the Service
                  </li>
                  <li>
                    <strong>Security</strong> — to detect, prevent, and address
                    fraud, abuse, security issues, and technical problems
                  </li>
                  <li>
                    <strong>Compliance</strong> — to comply with legal
                    obligations, enforce our terms of service, and protect our
                    rights and the rights of others
                  </li>
                  <li>
                    <strong>Billing &amp; Payments</strong> — to process
                    subscription payments, generate invoices, and manage your
                    billing history
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  We will only use your personal data for the purposes for which
                  we collected it, unless we reasonably consider that we need to
                  use it for another reason that is compatible with the original
                  purpose.
                </p>
              </section>

              {/* ───── 4. How We Share Your Information ───── */}
              <section id="how-we-share" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  4. How We Share Your Information
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We do not sell your personal information. We may share your
                  information in the following circumstances:
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.1 Service Providers
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We share data with trusted third-party service providers who
                  assist us in operating the Service:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong>Meta Platforms, Inc.</strong> — for WhatsApp Business
                    API integration, message delivery, and template management
                  </li>
                  <li>
                    <strong>Stripe, Inc.</strong> — for payment processing,
                    subscription billing, and invoice management
                  </li>
                  <li>
                    <strong>PayPal Holdings, Inc.</strong> — for alternative
                    payment processing
                  </li>
                  <li>
                    <strong>Amazon Web Services (AWS)</strong> — for cloud
                    infrastructure, data storage, and computing services
                  </li>
                  <li>
                    <strong>Analytics providers</strong> — for aggregated usage
                    analytics and product improvement
                  </li>
                  <li>
                    <strong>Email delivery services</strong> — for transactional
                    and marketing email delivery
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  All service providers are contractually obligated to process
                  data only as instructed by us and to maintain appropriate
                  security measures.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.2 Legal Requirements
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We may disclose your information if required to do so by law or
                  in response to valid requests by public authorities (e.g., a
                  court order, subpoena, or government investigation). We will
                  notify you of such disclosure unless legally prohibited from
                  doing so.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.3 Business Transfers
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  In the event of a merger, acquisition, reorganization,
                  bankruptcy, or sale of all or a portion of our assets, your
                  personal information may be transferred as part of that
                  transaction. We will notify you via email and/or a prominent
                  notice on our website of any change in ownership or uses of your
                  personal information.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.4 With Your Consent
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may share your information with third parties when you have
                  given us explicit consent to do so, such as when you authorize
                  an integration with a third-party application through our
                  marketplace.
                </p>
              </section>

              {/* ───── 5. Data Storage & Security ───── */}
              <section id="data-storage-security" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  5. Data Storage &amp; Security
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  5.1 Data Storage
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Your data is stored on secure servers hosted by Amazon Web
                  Services (AWS) in data centers located in the United States and
                  the European Union. We employ database encryption at rest
                  (AES-256) and in transit (TLS 1.2+) for all data storage and
                  transmission.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  5.2 Security Measures
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We implement industry-standard security measures to protect your
                  information, including:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Encryption of data in transit (TLS 1.2+) and at rest (AES-256)</li>
                  <li>Role-based access controls (RBAC) with least-privilege principles</li>
                  <li>Multi-factor authentication (MFA) for account access</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Automated vulnerability scanning and dependency monitoring</li>
                  <li>Employee background checks and security awareness training</li>
                  <li>Incident response procedures and breach notification protocols</li>
                  <li>Secure software development lifecycle (SSDLC) practices</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  5.3 SOC 2 Compliance
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We are actively pursuing SOC 2 Type II certification and have
                  implemented controls aligned with the Trust Services Criteria
                  (security, availability, processing integrity, confidentiality,
                  and privacy). While we cannot guarantee absolute security, we
                  are committed to maintaining the highest commercially reasonable
                  security standards.
                </p>
              </section>

              {/* ───── 6. Data Retention ───── */}
              <section id="data-retention" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  6. Data Retention
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We retain your personal information and business data for as
                  long as your account is active or as needed to provide the
                  Service. Specific retention periods include:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong>Account Data</strong> — retained for the duration of
                    your subscription and up to 90 days after account termination
                    to allow for reactivation
                  </li>
                  <li>
                    <strong>Business Data</strong> — retained for the duration of
                    your subscription; upon account termination, data is deleted
                    within 30 days unless you request an export
                  </li>
                  <li>
                    <strong>WhatsApp Messages</strong> — stored for the duration
                    configured in your account settings (default: 90 days) and
                    automatically purged thereafter
                  </li>
                  <li>
                    <strong>Billing Records</strong> — retained for 7 years as
                    required by tax and financial regulations
                  </li>
                  <li>
                    <strong>Usage Analytics</strong> — aggregated and
                    anonymized within 12 months; raw logs deleted within 90 days
                  </li>
                  <li>
                    <strong>Security Logs</strong> — retained for 12 months for
                    security auditing and incident investigation
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Upon account termination, you may request a full export of your
                  data before deletion. After the retention period expires, your
                  data is permanently and irreversibly deleted from our systems and
                  backups.
                </p>
              </section>

              {/* ───── 7. Your Rights ───── */}
              <section id="your-rights" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  7. Your Rights
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Depending on your location, you may have the following rights
                  regarding your personal data:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong>Right to Access</strong> — you can request a copy of
                    the personal data we hold about you
                  </li>
                  <li>
                    <strong>Right to Correction</strong> — you can request that we
                    correct inaccurate or incomplete personal data
                  </li>
                  <li>
                    <strong>Right to Deletion</strong> — you can request that we
                    delete your personal data, subject to certain legal
                    exceptions (e.g., ongoing legal obligations, financial record
                    retention)
                  </li>
                  <li>
                    <strong>Right to Data Portability</strong> — you can request
                    to receive your personal data in a structured, commonly used,
                    and machine-readable format (CSV or JSON)
                  </li>
                  <li>
                    <strong>Right to Object</strong> — you can object to our
                    processing of your personal data for direct marketing purposes
                    or processing based on legitimate interests
                  </li>
                  <li>
                    <strong>Right to Restrict Processing</strong> — you can
                    request that we limit how we use your data in certain
                    circumstances
                  </li>
                  <li>
                    <strong>Right to Withdraw Consent</strong> — where processing
                    is based on consent, you may withdraw consent at any time
                    without affecting the lawfulness of processing before
                    withdrawal
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  7.1 GDPR (European Economic Area)
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  If you are a resident of the European Economic Area (EEA), you
                  have the rights listed above under the General Data Protection
                  Regulation (GDPR). You also have the right to lodge a complaint
                  with your local supervisory authority.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  7.2 CCPA (California)
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  If you are a California resident, you have additional rights
                  under the California Consumer Privacy Act (CCPA), including the
                  right to know what personal information is collected, the right
                  to request deletion, the right to opt out of the sale of
                  personal information (we do not sell your data), and the right
                  to non-discrimination for exercising your rights.
                </p>

                <p className="text-muted-foreground leading-relaxed">
                  To exercise any of these rights, please contact us at{" "}
                  <a
                    href="mailto:privacy@serviceos.com"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    privacy@serviceos.com
                  </a>
                  . We will respond to your request within 30 days (or within the
                  timeframe required by applicable law).
                </p>
              </section>

              {/* ───── 8. WhatsApp & Meta Integration ───── */}
              <section id="whatsapp-meta" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  8. WhatsApp &amp; Meta Integration
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  ServiceOS integrates with the WhatsApp Business API, which is
                  operated by Meta Platforms, Inc. This section provides specific
                  details about how data is handled in connection with this
                  integration.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  8.1 Data Shared with Meta
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  When you use our WhatsApp integration, the following data may be
                  shared with or accessible by Meta:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Your WhatsApp Business phone number and display name</li>
                  <li>Message content sent through the WhatsApp Business API</li>
                  <li>Message templates submitted for approval</li>
                  <li>Phone numbers of your contacts for message delivery</li>
                  <li>Conversation metadata (timestamps, status indicators)</li>
                  <li>Opt-in and opt-out status of your contacts</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  8.2 Message Storage
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  WhatsApp messages processed through ServiceOS are stored
                  temporarily on our servers to provide conversation threading,
                  assignment, and analytics features. Messages are encrypted in
                  transit and at rest. You can configure the retention period for
                  messages in your account settings (default: 90 days). After the
                  retention period, messages are permanently deleted from our
                  systems.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  8.3 Opt-In Requirements
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Before sending WhatsApp messages to contacts through ServiceOS,
                  you must obtain explicit opt-in consent from each recipient in
                  compliance with WhatsApp&apos;s Commerce Policy and Meta&apos;s
                  Terms of Service. ServiceOS provides tools to manage opt-in and
                  opt-out preferences, but it is your responsibility to ensure
                  that you have proper consent before initiating communications.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  8.4 Meta&apos;s Privacy Practices
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Meta&apos;s processing of data received through the WhatsApp
                  Business API is governed by Meta&apos;s own privacy policy and
                  Data Processing Addendum. We encourage you to review{" "}
                  <a
                    href="https://www.whatsapp.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    WhatsApp&apos;s Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://www.facebook.com/privacy/policy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    Meta&apos;s Privacy Policy
                  </a>{" "}
                  for more information on how Meta handles data.
                </p>
              </section>

              {/* ───── 9. International Data Transfers ───── */}
              <section id="international-transfers" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  9. International Data Transfers
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  ServiceOS is headquartered in the United States, and our primary
                  data processing occurs in AWS data centers in the US and EU.
                  Your information may be transferred to, stored, and processed in
                  countries other than your country of residence.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  For transfers of personal data from the European Economic Area
                  (EEA), the United Kingdom, and Switzerland, we rely on:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    Standard Contractual Clauses (SCCs) approved by the European
                    Commission
                  </li>
                  <li>
                    The EU-U.S. Data Privacy Framework (if applicable)
                  </li>
                  <li>
                    Adequacy decisions recognized by the European Commission
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  We ensure that all transfers are conducted in compliance with
                  applicable data protection laws and that appropriate safeguards
                  are in place to protect your information.
                </p>
              </section>

              {/* ───── 10. Children's Privacy ───── */}
              <section id="childrens-privacy" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  10. Children&apos;s Privacy
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  ServiceOS is a business-to-business (B2B) platform and is not
                  intended for use by individuals under the age of 16. We do not
                  knowingly collect personal information from children under 16
                  years of age.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  If we become aware that we have collected personal data from a
                  child under 16 without verification of parental consent, we will
                  take steps to delete that information as soon as possible. If
                  you believe that a child under 16 has provided us with personal
                  data, please contact us at{" "}
                  <a
                    href="mailto:privacy@serviceos.com"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    privacy@serviceos.com
                  </a>
                  .
                </p>
              </section>

              {/* ───── 11. Changes to This Policy ───── */}
              <section id="changes" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  11. Changes to This Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We may update this Privacy Policy from time to time to reflect
                  changes in our practices, technologies, legal requirements, or
                  other factors. When we make material changes, we will:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    Post the updated policy on this page with a revised
                    &quot;Last updated&quot; date
                  </li>
                  <li>
                    Send an email notification to the address associated with your
                    account for significant changes
                  </li>
                  <li>
                    Display an in-app notification prompting you to review the
                    changes before they take effect
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  We encourage you to review this Privacy Policy periodically.
                  Your continued use of the Service after any changes constitutes
                  your acceptance of the updated policy.
                </p>
              </section>

              {/* ───── 12. Contact Us ───── */}
              <section id="contact" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  12. Contact Us
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  If you have any questions, concerns, or requests regarding this
                  Privacy Policy or our data practices, please contact us:
                </p>
                <div className="rounded-lg border border-border bg-card p-6 space-y-3">
                  <p className="text-foreground font-semibold">ServiceOS, Inc.</p>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">Email: </span>
                    <a
                      href="mailto:privacy@serviceos.com"
                      className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      privacy@serviceos.com
                    </a>
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">Website: </span>
                    <a
                      href="https://serviceos.com"
                      className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      serviceos.com
                    </a>
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">Mailing Address: </span>
                    ServiceOS, Inc., 100 CRM Boulevard, Suite 400, San Francisco, CA 94105, United States
                  </p>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  We aim to respond to all privacy-related inquiries within 30
                  business days. For data subject access requests, we will respond
                  within the timeframe required by applicable law (typically 30
                  days under GDPR and 45 days under CCPA).
                </p>
              </section>
            </article>
          </div>
        </div>
      </main>

      {/* ───── Footer ───── */}
      <footer className="mt-auto border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ServiceOS, Inc. All rights
              reserved.
            </p>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="/privacy-policy"
                className="hover:text-foreground transition-colors font-medium text-foreground"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/cookie-policy"
                className="hover:text-foreground transition-colors"
              >
                Cookie Policy
              </a>
              <a
                href="/acceptable-use"
                className="hover:text-foreground transition-colors"
              >
                Acceptable Use
              </a>
            </nav>
          </div>
        </div>
      </footer>

      {/* ── Intersection Observer for TOC highlighting ── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  var tocLinks = document.querySelectorAll('[data-toc-link]');
  if (!tocLinks.length) return;

  var sections = [];
  tocLinks.forEach(function(link) {
    var id = link.getAttribute('data-toc-link');
    var el = document.getElementById(id);
    if (el) sections.push({ id: id, el: el, link: link });
  });

  function setActive(id) {
    tocLinks.forEach(function(link) {
      if (link.getAttribute('data-toc-link') === id) {
        link.classList.add('toc-active');
        link.classList.remove('text-muted-foreground');
      } else {
        link.classList.remove('toc-active');
        link.classList.add('text-muted-foreground');
      }
    });
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        setActive(entry.target.id);
      }
    });
  }, {
    rootMargin: '-80px 0px -60% 0px',
    threshold: 0
  });

  sections.forEach(function(s) {
    observer.observe(s.el);
  });

  var style = document.createElement('style');
  style.textContent = '[data-toc-link].toc-active { background: rgba(16,185,129,0.1); color: rgb(16,185,129); font-weight: 600; border-left: 2px solid rgb(16,185,129); padding-left: 10px; }';
  document.head.appendChild(style);
})();
          `,
        }}
      />
    </div>
  );
}
