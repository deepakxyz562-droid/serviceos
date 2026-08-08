import { Check } from "lucide-react";

/**
 * FeatureMatrix
 * --------------
 * A two-column "Everything you need to run an [industry] business" table.
 * Shows a verified list of CRM capabilities with checkmarks.
 *
 * CRITICAL: This list is the SAME for every industry because the CRM features
 * are industry-agnostic. It was verified against the Prisma schema + actual
 * view components on [date]. DO NOT add items to this list without verifying
 * the feature actually exists in the codebase — adding false features here
 * would repeat the Task C bug (refrigerant logging, cert-based dispatch, etc.).
 *
 * Verified features (July 2026 audit):
 *   - Scheduling (booking-view, calendar-view, jobs-view)
 *   - Technician dispatch (dispatch-view)
 *   - Emergency job management (jobs-view, emergency-dialog)
 *   - Preventive maintenance (recurring-jobs-view)
 *   - Maintenance contracts (recurring-jobs-view)
 *   - Equipment history (CustomerAsset model, history-view)
 *   - Serial numbers (CustomerAsset.serialNumber)
 *   - Warranty tracking (CustomerAsset.warranty)
 *   - Technician certifications (ProviderCertification, employees-view)
 *   - Estimates / Quotes (quotes-view)
 *   - Invoicing (invoices-view)
 *   - Customer CRM (crm-view, contacts-view, customer-360-view)
 *   - SMS reminders (broadcast-view, campaigns-view)
 *   - Email notifications (email-campaigns-view, email-providers-view)
 *   - Mobile technician access (employee-portal-view — responsive web portal)
 *   - Before/after photos (PhotoCapture in jobs-view)
 *   - Digital signatures (SignaturePad in jobs-view)
 *   - Recurring jobs (recurring-jobs-view)
 *   - AI receptionist (ai-receptionist-view, AiReceptionistSection)
 *   - Checklists (checklists-view, ChecklistExecution in jobs-view)
 *
 * NOT included (verified as non-existent or disabled):
 *   - Route optimization (route_optimization=false on ALL plan tiers; dead
 *     stub view was removed — see src/lib/plan-features.ts line 219)
 *   - Refrigerant logging (no Prisma model)
 *   - Cert-based automatic dispatch (manual skill matching only)
 */

const VERIFIED_FEATURES: string[] = [
  "Scheduling",
  "Technician dispatch",
  "Emergency job management",
  "Preventive maintenance",
  "Maintenance contracts",
  "Equipment history",
  "Serial numbers",
  "Warranty tracking",
  "Technician certifications",
  "Estimates",
  "Invoicing",
  "Customer CRM",
  "SMS reminders",
  "Email notifications",
  "Mobile technician access",
  "Before/after photos",
  "Digital signatures",
  "Recurring jobs",
  "AI receptionist",
  "Checklists",
];

// Preserve acronyms (e.g. "HVAC" stays "HVAC", "Plumbing" becomes "plumbing")
function smartLower(name: string): string {
  return /^[A-Z]+$/.test(name) ? name : name.toLowerCase();
}

export function FeatureMatrix({ industryName }: { industryName: string }) {
  const lower = smartLower(industryName);
  return (
    <section className="border-t bg-muted/20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Everything you need to run an {lower} business
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            One platform replaces the spreadsheets, paper files, and scattered
            apps {lower} businesses rely on today.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-3 text-left font-semibold text-foreground">
                  {industryName} workflow
                </th>
                <th className="px-5 py-3 text-center font-semibold text-foreground w-24">
                  Fieseros
                </th>
              </tr>
            </thead>
            <tbody>
              {VERIFIED_FEATURES.map((feature, i) => (
                <tr
                  key={feature}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}
                >
                  <td className="px-5 py-2.5 text-foreground">{feature}</td>
                  <td className="px-5 py-2.5 text-center">
                    <Check className="inline h-4 w-4 text-emerald-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
