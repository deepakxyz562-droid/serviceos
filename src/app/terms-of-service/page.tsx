import { Bolt } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — ServiceOS CRM",
  description:
    "Read the Terms of Service for ServiceOS CRM, the all-in-one operations platform for service businesses. Covers subscriptions, integrations, data handling, and more. Last updated March 5, 2026.",
  openGraph: {
    title: "Terms of Service — ServiceOS CRM",
    description:
      "Read the Terms of Service for ServiceOS CRM, the all-in-one operations platform for service businesses. Covers subscriptions, integrations, data handling, and more.",
    url: "https://serviceos.com/terms-of-service",
    siteName: "ServiceOS",
    type: "website",
  },
};

const sections = [
  { id: "acceptance-of-terms", label: "1. Acceptance of Terms" },
  { id: "description-of-service", label: "2. Description of Service" },
  { id: "account-registration", label: "3. Account Registration" },
  { id: "subscription-billing", label: "4. Subscription & Billing" },
  { id: "acceptable-use", label: "5. Acceptable Use Policy" },
  { id: "intellectual-property", label: "6. Intellectual Property" },
  { id: "third-party-services", label: "7. Third-Party Services" },
  { id: "data-privacy", label: "8. Data & Privacy" },
  { id: "user-content", label: "9. User Content" },
  { id: "service-level", label: "10. Service Level & Availability" },
  { id: "termination", label: "11. Termination" },
  { id: "limitation-of-liability", label: "12. Limitation of Liability" },
  { id: "indemnification", label: "13. Indemnification" },
  { id: "disclaimers", label: "14. Disclaimers" },
  { id: "governing-law", label: "15. Governing Law" },
  { id: "dispute-resolution", label: "16. Dispute Resolution" },
  { id: "changes-to-terms", label: "17. Changes to Terms" },
  { id: "contact-information", label: "18. Contact Information" },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ───── Header ───── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <Bolt className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground">
              ServiceOS
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            &larr; Back to Home
          </Link>
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
                  Terms of Service
                </h1>
                <p className="mt-3 text-base text-muted-foreground">
                  Last updated:{" "}
                  <span className="font-medium text-foreground">
                    March 5, 2026
                  </span>
                </p>
              </div>

              {/* ───── 1. Acceptance of Terms ───── */}
              <section id="acceptance-of-terms" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  1. Acceptance of Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms of Service (&quot;Terms&quot;) govern your access to
                  and use of the ServiceOS platform and all related services,
                  features, applications, and websites (collectively, the
                  &quot;Service&quot;) operated by ServiceOS, Inc.
                  (&quot;ServiceOS,&quot; &quot;we,&quot; &quot;us,&quot; or
                  &quot;our&quot;).
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  By accessing or using the Service, you agree to be bound by
                  these Terms and our{" "}
                  <a
                    href="/privacy-policy"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    Privacy Policy
                  </a>
                  . If you do not agree to these Terms, you may not access or
                  use the Service.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You represent and warrant that you have the legal capacity to
                  enter into these Terms. If you are using the Service on behalf
                  of a business entity, you further represent and warrant that
                  you are authorized to bind that entity to these Terms.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Your continued use of the Service following the posting of any
                  changes to these Terms constitutes acceptance of those changes.
                </p>
              </section>

              {/* ───── 2. Description of Service ───── */}
              <section id="description-of-service" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  2. Description of Service
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS is a customer relationship management (CRM) and
                  business operations platform designed for service-based
                  businesses. The Service enables businesses to manage customer
                  relationships, schedule and dispatch jobs, communicate via
                  email, SMS, push, and in-app channels, process payments, generate
                  invoices, handle bookings, and automate workflows.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Service includes, but is not limited to, the following
                  features:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                  <li>Customer and contact management</li>
                  <li>Job scheduling, dispatch, and lifecycle tracking</li>
                  <li>Email, SMS, push, and in-app messaging</li>
                  <li>Invoice generation, payment processing, and billing</li>
                  <li>Booking and appointment management</li>
                  <li>Marketing campaigns and audience segmentation</li>
                  <li>Workflow automation and trigger-based actions</li>
                  <li>Employee management and team collaboration</li>
                  <li>Customer portal and self-service tools</li>
                  <li>Analytics, reporting, and dashboards</li>
                  <li>Third-party integrations and API access</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify, suspend, or discontinue any
                  part of the Service at any time, including the availability of
                  any feature, database, or content, with reasonable notice where
                  practicable.
                </p>
              </section>

              {/* ───── 3. Account Registration ───── */}
              <section id="account-registration" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  3. Account Registration
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  3.1 Account Creation
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To use the Service, you must register for an account by
                  providing accurate, current, and complete information. You are
                  responsible for maintaining the accuracy of your account
                  information at all times.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  3.2 Account Security
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You are responsible for safeguarding your account credentials
                  and for all activities that occur under your account. You must
                  immediately notify ServiceOS of any unauthorized use of your
                  account. ServiceOS will not be liable for any loss or damage
                  arising from your failure to protect your account credentials.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  3.3 Business Verification
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Certain features of the Service, including payment
                  processing and certain communication features, may require business
                  verification. You agree to provide accurate business
                  information and documentation as requested. ServiceOS reserves
                  the right to suspend accounts that fail verification or
                  provide misleading information.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  3.4 Account Restrictions
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  You must be at least 18 years of age to create an account. You
                  may not create multiple accounts for the same business entity
                  without prior written consent. Each account is associated with
                  a single business entity, and you may not transfer your account
                  to another party without our approval.
                </p>
              </section>

              {/* ───── 4. Subscription & Billing ───── */}
              <section id="subscription-billing" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  4. Subscription &amp; Billing
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.1 Plans and Pricing
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS offers multiple subscription plans with varying
                  features and usage limits. Current pricing and plan details are
                  available on our website. All prices are listed in US dollars
                  unless otherwise stated. We reserve the right to change pricing
                  at any time, subject to the notice requirements in Section 17.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.2 Payment Terms
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  By subscribing, you authorize ServiceOS to charge your payment
                  method on a recurring basis. Payments are due at the beginning
                  of each billing cycle. If a payment fails, we may retry the
                  charge and suspend access to the Service until payment is
                  successfully processed.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.3 Auto-Renewal
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Your subscription will automatically renew at the end of each
                  billing period unless you cancel before the renewal date. Upon
                  renewal, you will be charged the then-current rate for your
                  plan. You may cancel auto-renewal at any time through your
                  account settings or by contacting our support team.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.4 Trial Periods
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS may offer free trial periods for new subscribers.
                  Trials are limited to one per business entity. At the end of
                  the trial period, your subscription will automatically convert
                  to a paid plan unless you cancel before the trial expires. You
                  will be notified before any charges are applied.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.5 Refunds
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Subscription fees are non-refundable except as required by
                  applicable law or as expressly stated in these Terms. If you
                  are not satisfied with the Service, you may cancel your
                  subscription at any time, and you will retain access until the
                  end of your current billing period.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  4.6 Price Changes
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may change our pricing at any time. For existing
                  subscribers, we will provide at least 30 days&apos; advance
                  notice before any price increase takes effect. Price increases
                  will apply starting with your next billing cycle after the
                  notice period. If you do not agree with a price change, you may
                  cancel your subscription before the new pricing takes effect.
                </p>
              </section>

              {/* ───── 5. Acceptable Use Policy ───── */}
              <section id="acceptable-use" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  5. Acceptable Use Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You agree not to use the Service for any purpose that is
                  unlawful or prohibited by these Terms. The following activities
                  are strictly prohibited:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                  <li>Sending unsolicited or spam messages via any channel, including email or SMS</li>
                  <li>Transmitting content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
                  <li>Scraping, crawling, or extracting data from the Service or any third-party service integrated with the platform</li>
                  <li>Reverse engineering, decompiling, disassembling, or attempting to discover the source code of the Service</li>
                  <li>Abusing API rate limits, creating excessive accounts, or otherwise overloading the Service infrastructure</li>
                  <li>Using the Service to violate the privacy rights or intellectual property rights of others</li>
                  <li>Distributing malware, viruses, or any code of a destructive nature</li>
                  <li>Impersonating any person or entity, or falsely representing your affiliation with any person or entity</li>
                  <li>Using automated scripts or bots to interact with the Service without prior written authorization</li>
                  <li>Circumventing any security measures, authentication systems, or access controls</li>
                  <li>Using the Service to facilitate fraud, money laundering, or other financial crimes</li>
                  <li>Sharing your account credentials with unauthorized third parties</li>
                  <li>Using the Service in any manner that could damage, disable, or impair the Service or interfere with any other party&apos;s use</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  ServiceOS reserves the right to investigate and take
                  appropriate action against anyone who, in our sole discretion,
                  violates this policy, including removing content, suspending or
                  terminating accounts, and reporting violations to law
                  enforcement.
                </p>
              </section>

              {/* ───── 6. Intellectual Property ───── */}
              <section id="intellectual-property" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  6. Intellectual Property
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  6.1 ServiceOS Intellectual Property
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Service and all of its contents, features, and
                  functionality — including but not limited to software, text,
                  graphics, logos, icons, images, audio clips, data
                  compilations, and the design, selection, and arrangement
                  thereof — are owned by ServiceOS, its licensors, or other
                  providers of such material and are protected by international
                  copyright, trademark, patent, trade secret, and other
                  intellectual property or proprietary rights laws.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  6.2 User Content Ownership
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You retain ownership of all content that you upload, create, or
                  submit to the Service (&quot;User Content&quot;), including
                  customer data, messages, templates, documents, and business
                  information. Nothing in these Terms transfers ownership of your
                  User Content to ServiceOS.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  6.3 License Grant to ServiceOS
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  By uploading or submitting User Content to the Service, you
                  grant ServiceOS a worldwide, non-exclusive, royalty-free
                  license to use, reproduce, process, adapt, modify, publish,
                  transmit, store, and distribute such User Content solely for
                  the purpose of providing the Service to you, including
                  improving our systems, providing customer support, and
                  complying with legal obligations. This license terminates when
                  you delete your User Content or your account, except where
                  retention is required by law.
                </p>
              </section>

              {/* ───── 7. Third-Party Services ───── */}
              <section id="third-party-services" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  7. Third-Party Services
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Service may integrate with or provide links to third-party
                  services, including payment processors, communication
                  providers, and analytics platforms. Your use of third-party
                  services is subject to their respective terms and policies.
                  ServiceOS is not responsible for the availability, accuracy, or
                  legality of third-party services, and you use them at your own
                  risk.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  You are responsible for complying with all applicable terms of
                  service and policies of any third-party services you connect to
                  or use in conjunction with the Service. This includes obtaining
                  all necessary consents from your contacts before sending
                  communications and honoring opt-out requests promptly.
                  ServiceOS does not control and is not responsible for the
                  practices of these third-party services.
                </p>
              </section>

              {/* ───── 8. Data & Privacy ───── */}
              <section id="data-privacy" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  8. Data &amp; Privacy
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Your privacy is important to us. Our collection, use, and
                  disclosure of personal data is governed by our{" "}
                  <a
                    href="/privacy-policy"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    Privacy Policy
                  </a>
                  , which is incorporated into these Terms by reference.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  8.1 Data Processing
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS processes data on your behalf as a data processor
                  for the purpose of providing the Service. You are the data
                  controller for all User Content and customer data you upload to
                  the platform. You are responsible for ensuring that you have
                  obtained all necessary consents and legal bases for processing
                  such data.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  8.2 GDPR Compliance
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To the extent that the General Data Protection Regulation (GDPR)
                  applies to your use of the Service, ServiceOS acts as a data
                  processor under Article 28 of the GDPR. We process personal
                  data only in accordance with your instructions and the terms of
                  our Data Processing Agreement (DPA), which is available upon
                  request. We implement appropriate technical and organizational
                  measures to ensure a level of security appropriate to the risk.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  8.3 Data Retention
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your data for as long as your account is active or
                  as needed to provide the Service. After account termination, we
                  retain data for 30 days to allow for data export, after which
                  it is deleted in accordance with our data retention policy,
                  except where retention is required by law.
                </p>
              </section>

              {/* ───── 9. User Content ───── */}
              <section id="user-content" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  9. User Content
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  9.1 Ownership and Responsibility
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You own your User Content and are solely responsible for it,
                  including ensuring that it does not violate any applicable laws
                  or the rights of any third party. ServiceOS does not endorse,
                  verify, or take responsibility for any User Content.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  9.2 License to ServiceOS
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  As described in Section 6.3, you grant ServiceOS a limited
                  license to process and handle your User Content for the purpose
                  of providing the Service. This includes the right to display
                  your content within your account, process messages through
                  integrated channels, and generate reports and analytics based
                  on your data.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  9.3 Right to Remove
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  ServiceOS reserves the right to remove or disable access to any
                  User Content that, in our sole discretion, violates these
                  Terms, is objectionable, or could expose us or others to legal
                  liability. We will make reasonable efforts to notify you before
                  removing your content, unless immediate action is required to
                  comply with law or prevent harm.
                </p>
              </section>

              {/* ───── 10. Service Level & Availability ───── */}
              <section id="service-level" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  10. Service Level &amp; Availability
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  10.1 Best Effort
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS strives to provide a reliable and available Service,
                  but we do not guarantee uninterrupted access. The Service is
                  provided on a best-effort basis, and we make no commitments
                  regarding uptime, response times, or availability beyond what
                  is stated in any applicable Service Level Agreement (SLA)
                  provided with paid plans.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  10.2 No SLA for Free Plans
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Free and trial plans do not include any service level
                  commitments. Users on free plans may experience reduced
                  performance, feature limitations, and lower priority support.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  10.3 Maintenance Windows
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may perform scheduled maintenance, updates, or upgrades to
                  the Service. We will make reasonable efforts to provide advance
                  notice of scheduled maintenance that may affect Service
                  availability. Emergency maintenance may be performed without
                  prior notice when necessary to address security
                  vulnerabilities, critical bugs, or infrastructure issues.
                </p>
              </section>

              {/* ───── 11. Termination ───── */}
              <section id="termination" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  11. Termination
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  11.1 Termination by You
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may cancel your subscription or close your account at any
                  time through your account settings or by contacting our support
                  team. Upon cancellation, you will retain access to the Service
                  until the end of your current billing period. No partial
                  refunds will be provided for unused portions of a billing
                  period.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  11.2 Termination by ServiceOS
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS may suspend or terminate your account immediately,
                  without prior notice, for cause, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                  <li>Violation of these Terms or any applicable policies</li>
                  <li>Fraudulent, abusive, or unlawful activity</li>
                  <li>Conduct that could cause harm to ServiceOS, its users, or third parties</li>
                  <li>Failure to pay applicable fees after reasonable notice</li>
                  <li>Violation of third-party service policies</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  For terminations not involving immediate cause, ServiceOS will
                  provide at least 30 days&apos; written notice.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  11.3 Data Export
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Upon account termination, you may request an export of your
                  data within 30 days of termination. We will provide your data
                  in a commonly used, machine-readable format. It is your
                  responsibility to export any data you wish to retain before the
                  30-day period expires.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  11.4 Data Deletion
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  After the 30-day post-termination data export period, ServiceOS
                  will permanently delete your account data, including User
                  Content, customer records, messages, and all associated
                  information, in accordance with our data retention policy.
                  Certain data may be retained as required by law, for legal
                  proceedings, or as anonymized, aggregated data that cannot
                  identify you or your customers.
                </p>
              </section>

              {/* ───── 12. Limitation of Liability ───── */}
              <section id="limitation-of-liability" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  12. Limitation of Liability
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  12.1 Liability Cap
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To the maximum extent permitted by applicable law, ServiceOS&apos;s
                  total aggregate liability arising out of or related to these
                  Terms or the Service shall not exceed the total amount paid by
                  you to ServiceOS during the twelve (12) months immediately
                  preceding the event giving rise to the claim.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  12.2 Exclusion of Consequential Damages
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To the maximum extent permitted by applicable law, in no event
                  shall ServiceOS be liable for any indirect, incidental,
                  special, consequential, or punitive damages, including but not
                  limited to loss of profits, data, use, goodwill, or other
                  intangible losses, regardless of whether such damages are based
                  on contract, tort, strict liability, or any other legal theory,
                  and whether or not ServiceOS has been advised of the
                  possibility of such damages.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  12.3 Basis of the Bargain
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  The limitations and disclaimers in this Section apply whether
                  or not the limited remedies provided in these Terms fail of
                  their essential purpose. These limitations reflect a deliberate
                  allocation of risk between the parties and form an essential
                  basis of the bargain.
                </p>
              </section>

              {/* ───── 13. Indemnification ───── */}
              <section id="indemnification" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  13. Indemnification
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You agree to indemnify, defend, and hold harmless ServiceOS,
                  its officers, directors, employees, agents, licensors, and
                  service providers from and against any and all claims,
                  damages, losses, costs, expenses (including reasonable
                  attorneys&apos; fees), and liabilities arising out of or
                  related to:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                  <li>Your use of the Service, including any use that violates these Terms</li>
                  <li>Your User Content, including claims that it infringes the rights of any third party</li>
                  <li>Your violation of any applicable laws or regulations</li>
                  <li>Your violation of any third-party service terms</li>
                  <li>Any claims by your customers or end users related to your use of the Service</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  ServiceOS reserves the right, at its own expense, to assume
                  the exclusive defense and control of any matter subject to
                  indemnification by you, and in such case, you agree to
                  cooperate with ServiceOS&apos;s defense of such claim.
                </p>
              </section>

              {/* ───── 14. Disclaimers ───── */}
              <section id="disclaimers" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  14. Disclaimers
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                  AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS
                  OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                  NON-INFRINGEMENT, AND COURSE OF DEALING.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS does not warrant that: (a) the Service will be
                  uninterrupted, timely, secure, or error-free; (b) the results
                  obtained from the use of the Service will be accurate or
                  reliable; (c) the quality of any products, services,
                  information, or other material purchased or obtained by you
                  through the Service will meet your expectations; or (d) any
                  errors in the Service will be corrected.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  You assume all risk for any damage that may result from your
                  use of the Service, including damage to your business, data,
                  or systems. No advice or information, whether oral or written,
                  obtained from ServiceOS or through the Service, shall create
                  any warranty not expressly stated in these Terms.
                </p>
              </section>

              {/* ───── 15. Governing Law ───── */}
              <section id="governing-law" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  15. Governing Law
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms shall be governed by and construed in accordance
                  with the laws of the State of Delaware, United States of
                  America, without regard to its conflict of law principles.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  All claims and disputes arising out of or related to these
                  Terms or the Service shall be litigated exclusively in the
                  federal or state courts located in the State of Delaware, and
                  you consent to the personal jurisdiction of such courts.
                </p>
              </section>

              {/* ───── 16. Dispute Resolution ───── */}
              <section id="dispute-resolution" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  16. Dispute Resolution
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  16.1 Arbitration
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Any dispute, claim, or controversy arising out of or relating
                  to these Terms or the breach, termination, enforcement,
                  interpretation, or validity thereof, including the
                  determination of the scope or applicability of this agreement
                  to arbitrate, shall be resolved by binding arbitration
                  administered by the American Arbitration Association (&quot;AAA&quot;)
                  under its Commercial Arbitration Rules.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The arbitration shall be conducted in the State of Delaware.
                  The arbitrator shall have the authority to grant any remedy or
                  relief that a court of competent jurisdiction could order,
                  including provisional remedies. The arbitrator&apos;s decision
                  shall be final and binding, and judgment upon the award may be
                  entered in any court having jurisdiction.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  16.2 Class Action Waiver
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE
                  CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS,
                  CONSOLIDATED, OR REPRESENTATIVE ACTION. You waive any right to
                  participate in a class action lawsuit or class-wide arbitration
                  against ServiceOS.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                  16.3 Exceptions
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Notwithstanding the above, either party may seek injunctive or
                  equitable relief in any court of competent jurisdiction to
                  prevent the actual or threatened infringement, misappropriation,
                  or violation of intellectual property rights, or to enforce
                  payment obligations. Claims of less than $10,000 may be
                  brought in small claims court without arbitration.
                </p>
              </section>

              {/* ───── 17. Changes to Terms ───── */}
              <section id="changes-to-terms" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  17. Changes to Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS reserves the right to modify or replace these Terms
                  at any time. If a revision is material, we will provide at
                  least 30 days&apos; notice prior to any new terms taking
                  effect by posting the updated Terms on our website and sending
                  a notification to the email address associated with your
                  account.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  What constitutes a material change will be determined at our
                  sole discretion, in good faith, and using common sense.
                  Material changes include, but are not limited to, changes to:
                  subscription pricing, liability limitations, dispute resolution
                  procedures, and data handling practices.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Your continued use of the Service after the effective date of
                  any changes constitutes your acceptance of the revised Terms.
                  If you do not agree to the revised Terms, you must stop using
                  the Service and may cancel your account as described in
                  Section 11.
                </p>
              </section>

              {/* ───── 18. Contact Information ───── */}
              <section id="contact-information" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-emerald-500 pl-4 mb-4">
                  18. Contact Information
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have any questions, concerns, or requests regarding
                  these Terms of Service, please contact us:
                </p>
                <div className="rounded-lg border bg-card p-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-semibold text-foreground">Company:</span>
                    <span className="text-sm text-muted-foreground">ServiceOS, Inc.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-semibold text-foreground">Website:</span>
                    <a
                      href="https://serviceos.com"
                      className="text-sm text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      serviceos.com
                    </a>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-semibold text-foreground">Email:</span>
                    <a
                      href="mailto:legal@serviceos.com"
                      className="text-sm text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      legal@serviceos.com
                    </a>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-semibold text-foreground">Address:</span>
                    <span className="text-sm text-muted-foreground">
                      ServiceOS, Inc.<br />
                      1201 Orange Street, Suite 600<br />
                      Wilmington, DE 19801<br />
                      United States of America
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  For support inquiries, please visit our{" "}
                  <a
                    href="/contact-us"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    Contact Us
                  </a>{" "}
                  page.
                </p>
              </section>
            </article>
          </div>
        </div>
      </main>

      {/* ───── Footer ───── */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 ServiceOS, Inc. All rights reserved.
            </p>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="/privacy-policy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-foreground transition-colors font-medium text-foreground"
              >
                Terms of Service
              </a>
              <a
                href="/data-deletion"
                className="hover:text-foreground transition-colors"
              >
                Data Deletion
              </a>
              <a
                href="/contact-us"
                className="hover:text-foreground transition-colors"
              >
                Contact Us
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
