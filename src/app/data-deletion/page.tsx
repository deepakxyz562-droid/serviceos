import { Bolt } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Policy — ServiceOS CRM",
  description:
    "Learn how to request deletion of your personal data from ServiceOS CRM. Covers account holders, end customers, and Meta platform users. Compliant with GDPR, CCPA, and Meta Platform Terms. Last updated March 5, 2026.",
  openGraph: {
    title: "Data Deletion Policy — ServiceOS CRM",
    description:
      "Learn how to request deletion of your personal data from ServiceOS CRM. Covers account holders, end customers, and Meta platform users. Compliant with GDPR, CCPA, and Meta Platform Terms.",
    url: "https://serviceos.com/data-deletion",
    siteName: "ServiceOS",
    type: "website",
  },
};

const sections = [
  { id: "overview", label: "1. Overview" },
  { id: "your-rights", label: "2. Your Rights" },
  { id: "how-to-request", label: "3. How to Request Data Deletion" },
  { id: "what-we-delete", label: "4. What Data We Delete" },
  { id: "what-we-retain", label: "5. What Data We Retain" },
  { id: "deletion-timeline", label: "6. Deletion Timeline" },
  { id: "meta-platform", label: "7. Data Deletion for Meta Platform" },
  { id: "third-party-data", label: "8. Third-Party Data" },
  { id: "verification-confirmation", label: "9. Verification & Confirmation" },
  { id: "withdrawal-of-consent", label: "10. Withdrawal of Consent" },
  { id: "data-portability", label: "11. Data Portability" },
  { id: "childrens-data", label: "12. Children's Data" },
  { id: "contact", label: "13. Contact Us" },
];

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ───── Header ───── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                  Data Deletion Policy
                </h1>
                <p className="mt-3 text-base text-muted-foreground">
                  Last updated:&nbsp;
                  <span className="font-medium text-foreground">
                    March 5, 2026
                  </span>
                </p>
              </div>

              {/* ── CTA Card ── */}
              <div className="mb-10 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 sm:p-8 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-foreground mb-2">
                      Request Data Deletion
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      You have the right to request deletion of your personal
                      data at any time. Follow the steps below to submit your
                      request.
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground leading-relaxed">
                      <li>
                        Send an email to{" "}
                        <a
                          href="mailto:privacy@serviceos.com"
                          className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700 font-medium"
                        >
                          privacy@serviceos.com
                        </a>{" "}
                        with the subject line &quot;Data Deletion Request.&quot;
                      </li>
                      <li>
                        Include your full name, email address, and account
                        details (if applicable).
                      </li>
                      <li>
                        Specify which data you would like deleted, or state
                        &quot;all personal data&quot; for a complete deletion.
                      </li>
                      <li>
                        We will confirm your identity and process your request
                        within the timelines outlined below.
                      </li>
                    </ol>
                  </div>
                  <div className="shrink-0">
                    <a
                      href="mailto:privacy@serviceos.com?subject=Data%20Deletion%20Request"
                      className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-emerald-600 hover:to-teal-700"
                    >
                      Email Us Now
                    </a>
                  </div>
                </div>
              </div>

              {/* ───── 1. Overview ───── */}
              <section id="overview" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  1. Overview
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS, Inc. (&quot;ServiceOS,&quot; &quot;we,&quot;
                  &quot;us,&quot; or &quot;our&quot;) is committed to protecting
                  your privacy and respecting your right to control your personal
                  data. This Data Deletion Policy explains how you can request
                  the deletion of your personal data held by ServiceOS and
                  outlines our obligations in processing such requests.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  This policy applies to all individuals whose personal data is
                  processed by ServiceOS, including:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-4">
                  <li>
                    <strong className="text-foreground">
                      ServiceOS Account Holders
                    </strong>{" "}
                    &mdash; businesses and professionals who use the ServiceOS
                    CRM platform to manage their operations.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      End Customers of ServiceOS Users
                    </strong>{" "}
                    &mdash; individuals whose data is entered into ServiceOS by
                    our account holders (e.g., customers, leads, contacts).
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Meta Platform Users
                    </strong>{" "}
                    &mdash; individuals who interact with ServiceOS through
                    Facebook integrations.
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  We comply with the General Data Protection Regulation (GDPR),
                  the California Consumer Privacy Act (CCPA), and the Meta
                  Platform Terms regarding data deletion. We will honor all valid
                  data deletion requests in accordance with applicable law.
                </p>
              </section>

              {/* ───── 2. Your Rights ───── */}
              <section id="your-rights" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  2. Your Rights
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You have the right to request the deletion of your personal
                  data under the following legal frameworks:
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  2.1 GDPR &mdash; Right to Erasure (Article 17)
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Under the General Data Protection Regulation, you have the
                  right to obtain the erasure of your personal data
                  (&quot;right to be forgotten&quot;) when:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    Your personal data is no longer necessary for the purpose
                    for which it was collected.
                  </li>
                  <li>
                    You withdraw your consent and there is no other legal basis
                    for processing.
                  </li>
                  <li>
                    You object to processing and there are no overriding
                    legitimate grounds.
                  </li>
                  <li>Your personal data has been unlawfully processed.</li>
                  <li>
                    Erasure is required to comply with a legal obligation.
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  2.2 CCPA &mdash; Right to Delete
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Under the California Consumer Privacy Act, California residents
                  have the right to request the deletion of their personal
                  information. We are required to delete your personal information
                  upon receipt of a verifiable request, subject to certain
                  exceptions outlined in this policy.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  2.3 Meta Platform Terms
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you interact with ServiceOS through Meta integrations
                  (Facebook Login), you have the right to
                  request deletion of the data we receive from Meta. We provide a
                  data deletion callback URL and honor all deletion requests
                  received through the Meta Platform in compliance with their
                  developer policies.
                </p>
              </section>

              {/* ───── 3. How to Request Data Deletion ───── */}
              <section id="how-to-request" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  3. How to Request Data Deletion
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We provide multiple channels for submitting data deletion
                  requests, depending on your relationship with ServiceOS.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  3.1 For ServiceOS Account Holders
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  If you have an active ServiceOS account, you can request data
                  deletion through:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong className="text-foreground">In-App Settings:</strong>{" "}
                    Navigate to Settings &rarr; Account &rarr; Delete Account.
                    This will initiate a full account deletion, including all
                    associated business data. You will be asked to confirm your
                    identity and acknowledge that this action is irreversible.
                  </li>
                  <li>
                    <strong className="text-foreground">Email Request:</strong>{" "}
                    Send an email to{" "}
                    <a
                      href="mailto:privacy@serviceos.com"
                      className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      privacy@serviceos.com
                    </a>{" "}
                    with the subject line &quot;Account Deletion Request.&quot;
                    Include your registered email address and a clear statement
                    requesting deletion. We will verify your identity before
                    processing.
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  3.2 For End Customers of ServiceOS Users
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  If your data has been entered into ServiceOS by one of our
                  account holders (e.g., as a customer, lead, or contact), you
                  can request deletion through:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong className="text-foreground">
                      Dedicated Request Form:
                    </strong>{" "}
                    Visit our data deletion request form at{" "}
                    <Link
                      href="/contact-us"
                      className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      serviceos.com/contact-us
                    </Link>{" "}
                    and select &quot;Data Deletion Request.&quot; You will need
                    to provide your name, email address, and the name of the
                    business that may have entered your data.
                  </li>
                  <li>
                    <strong className="text-foreground">Email Request:</strong>{" "}
                    Send an email to{" "}
                    <a
                      href="mailto:privacy@serviceos.com"
                      className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      privacy@serviceos.com
                    </a>{" "}
                    with the subject line &quot;Customer Data Deletion
                    Request.&quot; Include your full name and any identifying
                    information that may help us locate your records.
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Please note: If you are an end customer, we may need to
                  coordinate with the ServiceOS account holder who entered your
                  data. We will make every reasonable effort to process your
                  request directly and will notify the account holder as required
                  by law.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  3.3 For Meta Platform Users
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  If you interact with ServiceOS through
                  Facebook integrations, you can request deletion through:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-4">
                  <li>
                    <strong className="text-foreground">
                      Data Deletion Callback:
                    </strong>{" "}
                    Use the data deletion functionality provided within the
                    Facebook app settings. When you remove the ServiceOS app from
                    your Facebook account, a deletion request is automatically
                    sent to our callback URL.
                  </li>
                  <li>
                    <strong className="text-foreground">Email Request:</strong>{" "}
                    Send an email to{" "}
                    <a
                      href="mailto:privacy@serviceos.com"
                      className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      privacy@serviceos.com
                    </a>{" "}
                    with the subject line &quot;Meta Data Deletion Request.&quot;
                    Include your Facebook User ID so we
                    can locate and delete your data.
                  </li>
                </ul>
                <div className="rounded-lg border border-border bg-muted/40 p-4 mt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">
                      Important for Meta Users:
                    </strong>{" "}
                    When you delete the ServiceOS app from your Facebook account
                    or request data deletion through Facebook, we receive a
                    signed request containing your Facebook User ID. We use this
                    ID to locate and delete all associated data within our
                    systems. A confirmation code is provided for your records.
                  </p>
                </div>
              </section>

              {/* ───── 4. What Data We Delete ───── */}
              <section id="what-we-delete" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  4. What Data We Delete
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Upon receiving a valid data deletion request, we will delete
                  all personal data associated with your identity, including but
                  not limited to the following categories:
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  4.1 Account Data
                </h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    Profile information (name, email, phone number, avatar)
                  </li>
                  <li>Login credentials and authentication data</li>
                  <li>Account preferences and settings</li>
                  <li>Role assignments and team memberships</li>
                  <li>Subscription and plan details</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  4.2 Business Data
                </h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Customer records and contact information</li>
                  <li>Lead data and sales pipeline entries</li>
                  <li>Booking and appointment records</li>
                  <li>
                    Job assignments, dispatch records, and completion proofs
                  </li>
                  <li>Invoices, quotes, and payment records</li>
                  <li>Notes, tags, custom fields, and activity history</li>
                  <li>Workflow and automation configurations</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  4.3 Communication Data
                </h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Email logs and correspondence records</li>
                  <li>Chat transcripts and support ticket communications</li>
                  <li>Notification history and delivery records</li>
                  <li>Voice call logs (if applicable)</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  4.4 Payment Data
                </h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Billing address and invoicing records</li>
                  <li>Payment method references (tokenized identifiers)</li>
                  <li>Transaction history and receipts</li>
                  <li>Subscription billing records</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  <strong className="text-foreground">
                    Note on Card Numbers:
                  </strong>{" "}
                  ServiceOS does not store full credit/debit card numbers. Card
                  data is processed and stored by our payment processors (Stripe
                  and PayPal) in compliance with PCI-DSS standards. When you
                  request data deletion, we will remove all tokenized references
                  from our systems and request deletion of your payment data from
                  our payment processors.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  4.5 Usage Data
                </h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-4">
                  <li>Analytics and usage statistics</li>
                  <li>Application logs and error reports</li>
                  <li>Session data and device information</li>
                  <li>IP address records and geolocation data</li>
                  <li>Feature usage patterns and interaction data</li>
                </ul>
              </section>

              {/* ───── 5. What Data We Retain ───── */}
              <section id="what-we-retain" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  5. What Data We Retain
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  In certain limited circumstances, we may retain some of your
                  data even after a deletion request. These exceptions are
                  permitted under GDPR, CCPA, and other applicable laws:
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  5.1 Legally Required Retention
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We may retain data where required by law, including:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    Tax records and financial documents (retained for up to 7
                    years as required by tax regulations)
                  </li>
                  <li>
                    Transaction records required for accounting compliance
                  </li>
                  <li>
                    Records required for ongoing legal proceedings or disputes
                  </li>
                  <li>
                    Data required to fulfill contractual obligations to other
                    users
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  5.2 Anonymized or Aggregated Data
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Data that has been anonymized or aggregated in such a way that
                  it can no longer be used to identify you may be retained for
                  analytical and statistical purposes. This data is not
                  considered personal data under applicable law.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  5.3 Data in Backups
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Your data may exist in encrypted backup systems for a limited
                  period. We will delete your data from all active systems
                  promptly upon completion of a deletion request. Backup data is
                  automatically purged within{" "}
                  <strong className="text-foreground">30 days</strong> of the
                  deletion request. Backups are encrypted and cannot be accessed
                  or restored without authorized administrative procedures.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  5.4 Data Shared with Third Parties
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  If your data has been shared with third parties (e.g., Meta,
                  payment processors, sub-processors), we will notify those third
                  parties of your deletion request and instruct them to delete
                  your data in accordance with their own data retention policies.
                  We cannot guarantee deletion by third parties but will make
                  commercially reasonable efforts to ensure your data is removed
                  from their systems.
                </p>
              </section>

              {/* ───── 6. Deletion Timeline ───── */}
              <section id="deletion-timeline" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  6. Deletion Timeline
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We are committed to processing data deletion requests promptly
                  and within the timeframes required by law. The following
                  timelines apply:
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-semibold text-foreground">
                          Data Category
                        </th>
                        <th className="text-left p-4 font-semibold text-foreground">
                          Initiation
                        </th>
                        <th className="text-left p-4 font-semibold text-foreground">
                          Completion
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-4 text-muted-foreground">
                          Account Deletion
                        </td>
                        <td className="p-4 text-muted-foreground">
                          Within 24 hours
                        </td>
                        <td className="p-4 text-muted-foreground">
                          Within 30 days
                        </td>
                      </tr>
                      <tr className="border-b bg-muted/20">
                        <td className="p-4 text-muted-foreground">
                          Customer Data
                        </td>
                        <td className="p-4 text-muted-foreground">
                          Within 48 hours
                        </td>
                        <td className="p-4 text-muted-foreground">
                          Within 15 business days
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-4 text-muted-foreground">
                          Meta Platform Data
                        </td>
                        <td className="p-4 text-muted-foreground">
                          Callback within 24 hours
                        </td>
                        <td className="p-4 text-muted-foreground">
                          Within 30 days
                        </td>
                      </tr>
                      <tr className="border-b bg-muted/20">
                        <td className="p-4 text-muted-foreground">
                          Backup Data
                        </td>
                        <td className="p-4 text-muted-foreground">
                          &mdash;
                        </td>
                        <td className="p-4 text-muted-foreground">
                          Within 30 days (automatic purge)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-muted-foreground leading-relaxed mt-4">
                  Under GDPR, we are required to confirm deletion &quot;without
                  undue delay&quot; and in any event within one month of receipt
                  of the request. Under CCPA, we must respond within 45 days
                  (with one 45-day extension if necessary). We aim to complete
                  all deletion requests well within these statutory timeframes.
                </p>
              </section>

              {/* ───── 7. Data Deletion for Meta Platform ───── */}
              <section id="meta-platform" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  7. Data Deletion for Meta Platform
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS integrates with Meta platforms (Facebook Login) to provide authentication and business management
                  features. This section describes how we handle data deletion
                  requests originating from Meta in compliance with the Meta
                  Platform Terms.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  7.1 Facebook App Integration
                </h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong className="text-foreground">
                      Facebook App ID:
                    </strong>{" "}
                    Our ServiceOS Facebook App is registered with Meta and has a
                    designated App ID.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Data Deletion Callback URL:
                    </strong>{" "}
                    We provide a data deletion callback URL that Meta uses to
                    send deletion requests when a user removes the ServiceOS app
                    from their Facebook account.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Callback Processing:
                    </strong>{" "}
                    When we receive a deletion callback from Meta, we locate all
                    data associated with the provided Facebook User ID and
                    initiate deletion within 24 hours.
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  7.2 What Data We Receive from Meta
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  When you use ServiceOS through Meta integrations, we may
                  receive and store the following data:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Facebook User ID</li>
                  <li>
                    Facebook profile name and email (if authorized)
                  </li>
                  <li>
                    Contact lists synced from Facebook (if authorized)
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  7.3 How Meta Data Is Deleted
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  When a deletion request is received via the Meta callback:
                </p>
                <ol className="list-decimal pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    We verify the authenticity of the signed request from Meta.
                  </li>
                  <li>
                    We locate all data associated with the Facebook User ID in
                    our systems.
                  </li>
                  <li>
                    We permanently delete the data from our primary databases.
                  </li>
                  <li>
                    We generate a unique confirmation code for the deletion.
                  </li>
                  <li>
                    The data is removed from backups within 30 days through our
                    automated backup rotation.
                  </li>
                </ol>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  7.4 Confirmation Code Process
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  After processing a Meta-initiated data deletion request, we
                  provide a confirmation code that serves as proof of deletion.
                  This code is returned to Meta via the callback response and can
                  also be provided to you upon request. If you need your
                  confirmation code, please contact us at{" "}
                  <a
                    href="mailto:privacy@serviceos.com"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    privacy@serviceos.com
                  </a>
                  .
                </p>
              </section>

              {/* ───── 8. Third-Party Data ───── */}
              <section id="third-party-data" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  8. Third-Party Data
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  ServiceOS integrates with several third-party services. When
                  you request data deletion, we take the following actions with
                  respect to data held by our partners:
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  8.1 Meta (Facebook)
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We request deletion of your data from Meta via their API. This
                  includes removing Facebook Login profile
                  associations and requesting deletion of account metadata.
                  Please note that Meta may retain certain data in accordance
                  with their own data policies and legal obligations. We
                  encourage you to review Meta&apos;s data policy at{" "}
                  <a
                    href="https://www.facebook.com/policy.php"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    facebook.com/policy.php
                  </a>
                  .
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  8.2 Stripe/PayPal
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Payment data processed through Stripe and PayPal is subject to
                  their respective data retention policies. Full credit/debit
                  card numbers are never stored on ServiceOS servers. When you
                  request data deletion:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    We remove all tokenized payment references and billing
                    records from our systems.
                  </li>
                  <li>
                    We request deletion of your customer records from Stripe and
                    PayPal.
                  </li>
                  <li>
                    Certain financial records may be retained by our payment
                    processors for up to 7 years as required by financial
                    regulations (e.g., anti-money laundering laws, tax
                    compliance).
                  </li>
                  <li>
                    Stripe and PayPal handle data deletion in accordance with
                    their own privacy policies and legal obligations.
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  8.3 AWS (Amazon Web Services)
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  ServiceOS uses AWS for infrastructure and data storage. When
                  your account is deleted, all data stored on AWS infrastructure
                  is deleted along with your account. This includes database
                  records, file uploads, and application logs. AWS
                  infrastructure-level metadata (e.g., CloudWatch logs, S3 access
                  logs) is automatically purged according to AWS retention
                  policies, typically within 90 days.
                </p>
              </section>

              {/* ───── 9. Verification & Confirmation ───── */}
              <section
                id="verification-confirmation"
                className="scroll-mt-24 mb-12"
              >
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  9. Verification &amp; Confirmation
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To protect against unauthorized deletion requests, we verify
                  the identity of the requester before processing any data
                  deletion. The verification process may include:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    Confirming the request was sent from the email address
                    associated with the account
                  </li>
                  <li>
                    Requiring login to the ServiceOS account for in-app deletion
                    requests
                  </li>
                  <li>
                    Verifying identity through a government-issued ID (in rare
                    cases where identity cannot be confirmed through other means)
                  </li>
                  <li>
                    Verifying the signed request from Meta for callback-based
                    deletion
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  9.1 Deletion Confirmation Email
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Once your data deletion has been completed, we will send a
                  confirmation email to the address associated with your account
                  (or the address you provided in your deletion request). This
                  email will include:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>A summary of the data categories that were deleted</li>
                  <li>The date of deletion</li>
                  <li>A unique deletion confirmation code</li>
                  <li>
                    Information about any data that was retained (with the legal
                    basis for retention)
                  </li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                  9.2 Deletion Certificate
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Upon request, we can provide a formal Deletion Certificate that
                  serves as official documentation of the data deletion. This
                  certificate includes your name, the date of deletion, the
                  categories of data deleted, and our authorized signature. To
                  request a Deletion Certificate, please contact{" "}
                  <a
                    href="mailto:privacy@serviceos.com"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    privacy@serviceos.com
                  </a>{" "}
                  after receiving your deletion confirmation.
                </p>
              </section>

              {/* ───── 10. Withdrawal of Consent ───── */}
              <section
                id="withdrawal-of-consent"
                className="scroll-mt-24 mb-12"
              >
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  10. Withdrawal of Consent
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Where we process your personal data based on your consent, you
                  have the right to withdraw that consent at any time. Withdrawal
                  of consent does not affect the lawfulness of processing carried
                  out before the withdrawal.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You can withdraw consent for the following processing
                  activities:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong className="text-foreground">
                      Marketing Communications:
                    </strong>{" "}
                    Unsubscribe from promotional emails using the link in any
                    marketing email, or update your preferences in Account
                    Settings.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      SMS Communications:
                    </strong>{" "}
                    Opt out of SMS messages by replying &quot;STOP&quot; to
                    any message, or contact us to update your communication
                    preferences.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Analytics &amp; Tracking:
                    </strong>{" "}
                    Disable analytics tracking in your Account Settings or
                    through your browser&apos;s cookie preferences.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Third-Party Data Sharing:
                    </strong>{" "}
                    Revoke permissions for third-party integrations (e.g.,
                    Facebook, Google) in your Account Settings.
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  To withdraw consent more broadly or for processing activities
                  not listed above, please contact us at{" "}
                  <a
                    href="mailto:privacy@serviceos.com"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    privacy@serviceos.com
                  </a>
                  .
                </p>
              </section>

              {/* ───── 11. Data Portability ───── */}
              <section id="data-portability" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  11. Data Portability
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Before requesting data deletion, you have the right to obtain a
                  copy of your personal data in a structured, commonly used, and
                  machine-readable format. This right is guaranteed under GDPR
                  Article 20 and is also available to CCPA-covered individuals.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS provides the following data export options:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong className="text-foreground">JSON Export:</strong> A
                    comprehensive export of all your data in JSON format,
                    suitable for importing into other systems or for your
                    personal records.
                  </li>
                  <li>
                    <strong className="text-foreground">CSV Export:</strong>{" "}
                    Tabular data exports in CSV format for easy viewing in
                    spreadsheet applications. Available for contacts, customers,
                    invoices, bookings, and job records.
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To export your data:
                </p>
                <ol className="list-decimal pl-6 space-y-1 text-muted-foreground leading-relaxed mb-6">
                  <li>Log in to your ServiceOS account.</li>
                  <li>
                    Navigate to Settings &rarr; Data Management &rarr; Export
                    Data.
                  </li>
                  <li>
                    Select the data categories you wish to export and your
                    preferred format (JSON or CSV).
                  </li>
                  <li>
                    Click &quot;Generate Export.&quot; You will receive a
                    download link via email once the export is ready.
                  </li>
                </ol>
                <p className="text-muted-foreground leading-relaxed">
                  If you do not have access to your account or are an end
                  customer, please contact{" "}
                  <a
                    href="mailto:privacy@serviceos.com"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    privacy@serviceos.com
                  </a>{" "}
                  to request a data export. We will verify your identity and
                  provide your data in your preferred format within 30 days.
                </p>
              </section>

              {/* ───── 12. Children's Data ───── */}
              <section id="childrens-data" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  12. Children&apos;s Data
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  ServiceOS is not intended for use by individuals under the age
                  of 16. We do not knowingly collect or process personal data
                  from children under 16 years of age.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If we discover that we have inadvertently collected personal
                  data from a child under the age of 16, we will take immediate
                  steps to delete that information from our servers. If you
                  become aware that a child under 16 has provided personal data
                  to ServiceOS, please contact us immediately at{" "}
                  <a
                    href="mailto:privacy@serviceos.com"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    privacy@serviceos.com
                  </a>{" "}
                  so that we can take appropriate action.
                </p>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20 dark:border-amber-900/50">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">
                      Immediate Action:
                    </strong>{" "}
                    Any confirmed children&apos;s data will be deleted from our
                    active systems within 24 hours of discovery and from all
                    backups within 30 days. No retention exceptions apply to
                    children&apos;s data.
                  </p>
                </div>
              </section>

              {/* ───── 13. Contact ───── */}
              <section id="contact" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  13. Contact Us
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have any questions, concerns, or requests regarding this
                  Data Deletion Policy or our data practices, please contact us
                  through the following channels:
                </p>

                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Email</p>
                      <a
                        href="mailto:privacy@serviceos.com"
                        className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                      >
                        privacy@serviceos.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">
                        Data Deletion Request Form
                      </p>
                      <Link
                        href="/contact-us"
                        className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                      >
                        serviceos.com/contact-us
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Website</p>
                      <a
                        href="https://serviceos.com"
                        className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                      >
                        serviceos.com
                      </a>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed mt-6">
                  We aim to respond to all data deletion requests and privacy
                  inquiries within 30 days. For urgent matters or if you believe
                  your data is at risk, please indicate &quot;URGENT&quot; in
                  your email subject line and we will prioritize your request.
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
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/data-deletion"
                className="hover:text-foreground transition-colors font-medium text-foreground"
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
