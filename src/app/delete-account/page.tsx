import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import type { Metadata } from "next";
import { CornerstoneFooter } from "@/components/seo/cornerstone-footer";
import { CornerstoneHeader } from "@/components/seo/cornerstone-header";

export const metadata: Metadata = {
  title: "Account and Data Deletion — BGOS & Fieseros",
  description:
    "Instructions and policy for requesting account and personal data deletion for BGOS (Business Growth Operating System) and Fieseros.",
  openGraph: {
    title: "Account & Data Deletion — BGOS by Fieseros",
    description: "Learn how to delete your BGOS account and associated business data.",
    url: "https://fieseros.com/delete-account",
    siteName: "Fieseros",
    type: "website",
  },
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <CornerstoneHeader activePath="/delete-account" />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BrandMark size={28} />
              <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">BGOS by Fieseros</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
              Account & Associated Data Deletion
            </h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
              At Fieseros (developer of BGOS — Business Growth Operating System, app package: <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">com.fieseros.bgos</code>), we respect your data privacy and give you full control over your personal and business data.
            </p>
          </div>

          {/* Section 1: In-App Deletion */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-semibold">1</span>
              Delete Your Account Directly Inside the App
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You can instantly trigger your account deletion from the mobile app without waiting for manual support:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300 ml-2">
              <li>Open the <strong>BGOS</strong> app and log in to your account.</li>
              <li>Navigate to <strong>Settings</strong> (or open the side menu drawer / Tools tab).</li>
              <li>Scroll down to the <strong>Danger Zone / Account Settings</strong> section.</li>
              <li>Tap <strong>Delete Account</strong> and confirm the action.</li>
              <li>Your active session will be invalidated immediately, and your deletion request will be processed.</li>
            </ol>
          </div>

          {/* Section 2: Request via Email / Web */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-semibold">2</span>
              Request Account Deletion via Email
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              If you have uninstalled the app or prefer to request deletion via email, you may contact our privacy compliance team directly:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300 ml-2">
              <li>
                Send an email from your registered account address to:{" "}
                <a href="mailto:admin@fieseros.com" className="text-emerald-600 font-semibold underline hover:text-emerald-700">
                  admin@fieseros.com
                </a>{" "}
                or{" "}
                <a href="mailto:support@fieseros.com" className="text-emerald-600 font-semibold underline hover:text-emerald-700">
                  support@fieseros.com
                </a>
              </li>
              <li>Subject line: <strong>Account & Data Deletion Request - BGOS</strong></li>
              <li>Include your registered email address and workspace/business name.</li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Our team verifies account ownership and confirms deletion within <strong>7 business days</strong>.
            </p>
          </div>

          {/* Section 3: Data Types & Retention Period */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-semibold">3</span>
              What Data is Deleted vs. Retained
            </h2>
            
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Data Permanently Deleted (within 30 days):
                </h3>
                <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 mt-1 space-y-1 ml-2">
                  <li>Personal details: Name, email address, phone number, and profile picture.</li>
                  <li>Authentication credentials: Passwords (hashes), OAuth session tokens, refresh tokens.</li>
                  <li>Connected integration credentials: Google Business Profile OAuth tokens, social media connection keys.</li>
                  <li>Marketing & AI drafts: Generated AI social posts, image prompts, scheduled post queues.</li>
                  <li>Customer messaging & CRM logs: Leads, contact dossiers, and customer conversations.</li>
                </ul>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Data Retained for Regulatory / Statutory Compliance:
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  Tax, billing, and transactional invoicing records are retained for up to <strong>7 years</strong> strictly to comply with applicable financial reporting, tax, and anti-fraud regulations. These records are isolated, encrypted, and never used for marketing purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="pt-4 flex items-center gap-4 text-sm">
            <Link href="/privacy-policy" className="text-emerald-600 underline hover:text-emerald-700">
              View Complete Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms-of-service" className="text-emerald-600 underline hover:text-emerald-700">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>

      <CornerstoneFooter />
    </div>
  );
}
