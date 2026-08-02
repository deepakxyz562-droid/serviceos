import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, Search, Wrench, FileText, ArrowLeft } from 'lucide-react';
import { StructuredData } from '@/components/seo/structured-data';
import { getBreadcrumbSchema } from '@/lib/seo/schemas';

// P1-13 (SEO): A helpful 404 page that:
//   • Sets robots noindex so Google doesn't index error pages
//   • Provides internal links to key pages (link equity + UX)
//   • Includes BreadcrumbList schema for rich results eligibility
//   • Uses semantic HTML (main, nav, h1) for accessibility
export const metadata: Metadata = {
  title: 'Page Not Found — Fieseros',
  description:
    'The page you were looking for could not be found. Explore Fieseros — the operating system for service businesses. Browse the marketplace, compare software, or contact us.',
  robots: { index: false, follow: true },
};

const popularLinks = [
  {
    href: '/',
    label: 'Homepage',
    description: 'The operating system for service businesses',
    icon: Home,
  },
  {
    href: '/marketplace',
    label: 'Marketplace',
    description: 'Browse 2,500+ verified service professionals',
    icon: Search,
  },
  {
    href: '/best-field-service-software',
    label: 'Best Field Service Software',
    description: 'Compare the top platforms side by side',
    icon: FileText,
  },
  {
    href: '/invoice-generator',
    label: 'Free Invoice Generator',
    description: 'Create professional invoices in seconds',
    icon: Wrench,
  },
];

export default function NotFound() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Page Not Found', url: '/404' },
  ]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-20">
      <StructuredData data={[breadcrumbSchema]} />

      <div className="mx-auto max-w-2xl text-center">
        <p className="text-7xl sm:text-8xl font-extrabold text-emerald-600 mb-4">
          404
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
          This page could not be found
        </h1>
        <p className="text-base text-muted-foreground mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved. Try one of these popular destinations instead:
        </p>

        <nav aria-label="Popular pages" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {popularLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md"
              >
                <Icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="block font-semibold text-foreground group-hover:text-emerald-700">
                    {link.label}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {link.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Homepage
        </Link>
      </div>
    </main>
  );
}
