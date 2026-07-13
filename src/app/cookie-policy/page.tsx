import { Bolt } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Cookie Policy — ServiceOS CRM",
  description:
    "Learn how ServiceOS CRM uses cookies and similar technologies to operate our service, remember your preferences, and measure performance. Last updated March 5, 2026.",
  openGraph: {
    title: "Cookie Policy — ServiceOS CRM",
    description:
      "Learn how ServiceOS CRM uses cookies and similar technologies to operate our service, remember your preferences, and measure performance.",
    url: "https://serviceos.com/cookie-policy",
    siteName: "ServiceOS",
    type: "website",
  },
};

const sections = [
  { id: "introduction", label: "1. Introduction" },
  { id: "types-of-cookies", label: "2. Types of Cookies We Use" },
  { id: "specific-cookies", label: "3. Specific Cookies Set" },
  { id: "managing-cookies", label: "4. Managing Cookies" },
  { id: "third-party-services", label: "5. Third-Party Services" },
  { id: "updates", label: "6. Updates to This Policy" },
  { id: "contact", label: "7. Contact Us" },
];

// ── Cookie type data ──────────────────────────────────────────────────────
const cookieTypes = [
  {
    type: "Strictly Necessary",
    purpose:
      "Enable core functionality such as authentication, session management, and security. The Service cannot operate without these.",
    duration: "Session — 30 days",
    consent: "No",
  },
  {
    type: "Performance",
    purpose:
      "Collect anonymous information about how visitors use the Service so we can measure and improve performance.",
    duration: "Up to 24 hours",
    consent: "Yes",
  },
  {
    type: "Functionality",
    purpose:
      "Remember your preferences and settings — such as theme, language, and layout — to provide a more personalized experience.",
    duration: "Up to 365 days",
    consent: "Yes",
  },
  {
    type: "Analytics",
    purpose:
      "Understand visitor behavior through aggregated statistics (page views, feature adoption, traffic source).",
    duration: "Up to 2 years",
    consent: "Yes",
  },
  {
    type: "Targeting / Advertising",
    purpose:
      "Used to deliver relevant marketing content and measure the effectiveness of advertising campaigns.",
    duration: "Up to 90 days",
    consent: "Yes",
  },
];

const specificCookies = [
  {
    name: "serviceos_auth",
    purpose: "Authenticates signed-in users and maintains the active session.",
    duration: "Session (cleared on logout, max 30 days)",
    type: "Strictly Necessary",
  },
  {
    name: "serviceos_consent",
    purpose:
      "Stores your cookie consent preferences (necessary, performance, functionality, analytics, advertising).",
    duration: "365 days",
    type: "Strictly Necessary",
  },
  {
    name: "serviceos_theme",
    purpose: "Remembers your selected light/dark theme preference.",
    duration: "365 days",
    type: "Functionality",
  },
  {
    name: "_ga",
    purpose:
      "Google Analytics — distinguishes unique users and assigns a random client identifier.",
    duration: "2 years",
    type: "Analytics",
  },
  {
    name: "_gid",
    purpose:
      "Google Analytics — distinguishes users during a single browsing session.",
    duration: "24 hours",
    type: "Analytics",
  },
];

export default function CookiePolicyPage() {
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
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16 w-full">
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
                  Cookie Policy
                </h1>
                <p className="mt-3 text-base text-muted-foreground">
                  Last updated:&nbsp;
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
                  &quot;us,&quot; or &quot;our&quot;) uses cookies and similar
                  tracking technologies (collectively, &quot;cookies&quot;) on
                  our website at{" "}
                  <a
                    href="https://serviceos.com"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    serviceos.com
                  </a>{" "}
                  and across the ServiceOS CRM platform (the
                  &quot;Service&quot;). Cookies are small text files placed on
                  your device that allow us to recognize you, remember your
                  preferences, and measure how the Service is used.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  This Cookie Policy explains, in plain language, the types of
                  cookies we use, the specific cookies we set, how you can
                  control or delete them, and the choices available to you. It
                  should be read alongside our{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    Privacy Policy
                  </Link>
                  , which explains how we collect, use, and protect your
                  personal information more broadly.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  By using the Service, you agree to the use of cookies as
                  described in this policy. Where cookies require your consent,
                  we will ask for it through our cookie consent banner the first
                  time you visit, and you may change your choice at any time by
                  clearing your browser storage.
                </p>
              </section>

              {/* ───── 2. Types of Cookies We Use ───── */}
              <section id="types-of-cookies" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  2. Types of Cookies We Use
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  We group the cookies used on the Service into five categories
                  based on their purpose and whether they require your consent.
                  Strictly necessary cookies are essential for the Service to
                  function and cannot be disabled. All other categories are
                  opt-in — you can accept or reject them through the consent
                  banner.
                </p>

                <div className="rounded-xl border border-border bg-white card-shadow overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="h-11 px-4 text-left font-semibold text-foreground">
                          Cookie Type
                        </TableHead>
                        <TableHead className="h-11 px-4 text-left font-semibold text-foreground">
                          Purpose
                        </TableHead>
                        <TableHead className="h-11 px-4 text-left font-semibold text-foreground">
                          Duration
                        </TableHead>
                        <TableHead className="h-11 px-4 text-left font-semibold text-foreground">
                          Consent Required
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cookieTypes.map((c) => (
                        <TableRow key={c.type}>
                          <TableCell className="px-4 py-3 align-top font-medium text-foreground whitespace-normal">
                            {c.type}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top text-muted-foreground whitespace-normal leading-relaxed">
                            {c.purpose}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top text-muted-foreground whitespace-normal">
                            {c.duration}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top whitespace-normal">
                            {c.consent === "No" ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                                No
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
                                Yes
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* ───── 3. Specific Cookies Set ───── */}
              <section id="specific-cookies" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  3. Specific Cookies Set
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  The following is a list of the specific cookies currently set
                  by the Service. We may add or remove cookies as we introduce
                  new features or modify existing ones; this list will be
                  updated accordingly. Cookie names prefixed with{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                    serviceos_
                  </code>{" "}
                  are first-party cookies set directly by us. Cookies prefixed
                  with an underscore (e.g.,{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                    _ga
                  </code>
                  ) are set by third-party services and are only deployed when
                  you have granted analytics consent.
                </p>

                <div className="rounded-xl border border-border bg-white card-shadow overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="h-11 px-4 text-left font-semibold text-foreground">
                          Cookie Name
                        </TableHead>
                        <TableHead className="h-11 px-4 text-left font-semibold text-foreground">
                          Purpose
                        </TableHead>
                        <TableHead className="h-11 px-4 text-left font-semibold text-foreground">
                          Duration
                        </TableHead>
                        <TableHead className="h-11 px-4 text-left font-semibold text-foreground">
                          Type
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specificCookies.map((c) => (
                        <TableRow key={c.name}>
                          <TableCell className="px-4 py-3 align-top whitespace-normal">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                              {c.name}
                            </code>
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top text-muted-foreground whitespace-normal leading-relaxed">
                            {c.purpose}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top text-muted-foreground whitespace-normal">
                            {c.duration}
                          </TableCell>
                          <TableCell className="px-4 py-3 align-top text-muted-foreground whitespace-normal">
                            {c.type}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                  Note: We also use{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                    localStorage
                  </code>{" "}
                  and{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                    sessionStorage
                  </code>{" "}
                  for client-side state (for example, caching the consent
                  decision and remembering the active workspace). These web
                  storage entries are not cookies and are not transmitted to our
                  servers on every request, but they serve a similar function
                  and are listed here for transparency.
                </p>
              </section>

              {/* ───── 4. Managing Cookies ───── */}
              <section id="managing-cookies" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  4. Managing Cookies
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You have full control over cookies. Most modern browsers let
                  you view, accept, block, or delete cookies through their
                  privacy settings. Disabling strictly necessary cookies will
                  prevent the Service from working correctly — for example, you
                  may not be able to sign in or maintain a session. Disabling
                  optional cookies (performance, functionality, analytics,
                  targeting) will not break the Service but may reduce your
                  experience quality.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  To manage cookies in your browser, follow the official guides
                  below:
                </p>
                <ul className="list-disc pl-6 space-y-1.5 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong>Google Chrome</strong> — Settings &rarr; Privacy and
                    security &rarr; Cookies and other site data. Choose whether
                    to block third-party cookies, clear on exit, or block all
                    cookies.
                  </li>
                  <li>
                    <strong>Mozilla Firefox</strong> — Settings &rarr; Privacy
                    &amp; Security &rarr; Enhanced Tracking Protection. Select
                    Standard, Strict, or Custom to control which cookies and
                    trackers are blocked.
                  </li>
                  <li>
                    <strong>Apple Safari (macOS &amp; iOS)</strong> —
                    Preferences/Settings &rarr; Privacy &rarr; Manage Website
                    Data, or enable &quot;Prevent cross-site tracking&quot; to
                    block third-party cookies.
                  </li>
                  <li>
                    <strong>Microsoft Edge</strong> — Settings &rarr; Cookies
                    and site permissions &rarr; Manage and delete cookies sent
                    to your device. Toggle &quot;Block third-party cookies&quot;
                    as needed.
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  To reset your ServiceOS consent preference specifically,
                  clear{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                    serviceos_consent
                  </code>{" "}
                  from your browser&apos;s local storage, or use the
                  &quot;Reset consent&quot; option in your account settings. The
                  consent banner will reappear the next time you visit.
                </p>
              </section>

              {/* ───── 5. Third-Party Services ───── */}
              <section id="third-party-services" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  5. Third-Party Services
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We integrate with trusted third-party providers that may set
                  their own cookies when you interact with their content or use
                  features they power. These third-party cookies are governed by
                  the respective providers&apos; own cookie and privacy
                  policies. The third parties we currently work with include:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed mb-6">
                  <li>
                    <strong>WhatsApp Business API (Meta Platforms, Inc.)</strong>{" "}
                    — Used to send and receive WhatsApp messages on your behalf.
                    Meta may set cookies on its own domains (e.g., during OAuth
                    connection flows). See Meta&apos;s Cookies Policy for
                    details.
                  </li>
                  <li>
                    <strong>Google Analytics</strong> — Used to collect
                    aggregated, anonymized usage statistics. Google sets the{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                      _ga
                    </code>{" "}
                    and{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                      _gid
                    </code>{" "}
                    cookies only if you have granted analytics consent.
                  </li>
                  <li>
                    <strong>Payment gateways (Stripe, PayPal)</strong> — Used to
                    process subscription and invoice payments. These providers
                    may set cookies on their own hosted payment pages to support
                    fraud detection and 3-D Secure authentication.
                  </li>
                  <li>
                    <strong>Cloud infrastructure (Amazon Web Services)</strong>{" "}
                    — Hosts the Service and may set operational cookies for load
                    balancing and session affinity.
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  We do not control and are not responsible for the cookies set
                  by these third parties. We encourage you to review their
                  respective privacy and cookie policies.
                </p>
              </section>

              {/* ───── 6. Updates to This Policy ───── */}
              <section id="updates" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  6. Updates to This Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may update this Cookie Policy from time to time to reflect
                  changes in the cookies we use, our business practices, or
                  applicable legal and regulatory requirements. When we do, we
                  will revise the &quot;Last updated&quot; date at the top of
                  this page.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If we make material changes — for example, introducing a new
                  category of cookies that process personal data — we will
                  notify you through the Service or via email (if you have an
                  account) and, where required, seek your fresh consent before
                  deploying the new cookies.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We encourage you to review this page periodically to stay
                  informed about how we use cookies.
                </p>
              </section>

              {/* ───── 7. Contact Us ───── */}
              <section id="contact" className="scroll-mt-24 mb-12">
                <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-4">
                  <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                  7. Contact Us
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have any questions, concerns, or requests regarding
                  this Cookie Policy or our use of cookies, please contact us:
                </p>
                <div className="rounded-xl border border-border bg-white card-shadow p-6 mb-4">
                  <p className="text-muted-foreground leading-relaxed mb-1">
                    <span className="font-medium text-foreground">Email: </span>
                    <a
                      href="mailto:privacy@serviceos.com"
                      className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      privacy@serviceos.com
                    </a>
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-1">
                    <span className="font-medium text-foreground">
                      Support:{" "}
                    </span>
                    <Link
                      href="/contact-us"
                      className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                    >
                      Contact our team
                    </Link>
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">
                      Mailing Address:{" "}
                    </span>
                    ServiceOS, Inc., 100 CRM Boulevard, Suite 400, San
                    Francisco, CA 94105, United States
                  </p>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  We aim to respond to all cookie- and privacy-related inquiries
                  within 30 business days.
                </p>
              </section>
            </article>
          </div>
        </div>
      </main>

      {/* ───── Footer ───── */}
      <footer className="mt-auto border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ServiceOS, Inc. All rights
              reserved.
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
                href="/cookie-policy"
                className="hover:text-foreground transition-colors font-medium text-foreground"
              >
                Cookie Policy
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
