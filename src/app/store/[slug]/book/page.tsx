import React from 'react';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Clock, CalendarDays, Store } from 'lucide-react';
import { getTenantEventTypes } from '@/features/scheduling/services/event-type-service';
import { BookForm } from './book-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

/** Display symbol for an event-type currency code (falls back to the code). */
function currencySymbol(code?: string): string {
  switch ((code || '').toUpperCase()) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'AUD':
      return 'A$';
    case '':
      return '₹';
    default:
      return `${code} `;
  }
}

export async function generateMetadata({ params }: BookPageProps) {
  const { slug } = await params;
  let name = 'Online Store';
  try {
    const tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { slug },
          { publicSlug: slug },
          { id: slug },
          { slug: decodeURIComponent(slug) },
          { publicSlug: decodeURIComponent(slug) },
        ],
      },
      select: { name: true },
    });
    if (tenant?.name) name = tenant.name;
  } catch {}
  return {
    title: `Book an appointment — ${name}`,
    description: `View bookable services and request an appointment with ${name}.`,
  };
}

export default async function StoreBookPage({ params }: BookPageProps) {
  const { slug } = await params;

  // Resolve the tenant/business by slug — same resolution pattern as the
  // store page (src/app/store/[slug]/page.tsx). No demo fallback here: an
  // unknown slug honestly 404s instead of booking against a fake store.
  const tenant = await db.tenant
    .findFirst({
      where: {
        OR: [
          { slug },
          { publicSlug: slug },
          { id: slug },
          { slug: decodeURIComponent(slug) },
          { publicSlug: decodeURIComponent(slug) },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        logo: true,
      },
    })
    .catch(() => null);

  if (!tenant) {
    notFound();
  }

  // Active bookable services (same source as every other scheduling flow —
  // Tenant.settingsJson via the event-type service).
  const eventTypes = (await getTenantEventTypes(tenant.id).catch(() => []))
    .filter((e) => e.isActive)
    .map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      duration: e.duration,
      price: e.price,
      currency: e.currency,
      description: e.description,
    }));

  const businessName = tenant.name || 'Local Store';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-stone-900">
      <header className="border-b border-[#DCE9E3] bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A6847]">
            <Store className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold tracking-tight text-[#111827]">
              {businessName}
            </h1>
            <p className="text-xs text-[#64748B]">Online booking</p>
          </div>
          <a
            href={`/store/${encodeURIComponent(tenant.slug || slug)}`}
            className="ml-auto shrink-0 rounded-xl border border-[#DCE9E3] px-3 py-1.5 text-xs font-semibold text-[#1E293B] transition hover:bg-[#F4F8F6]"
          >
            Visit store
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
        {eventTypes.length === 0 ? (
          /* Honest empty state — nothing is bookable yet. */
          <div className="rounded-2xl border border-[#DCE9E3] bg-white p-10 text-center shadow-sm">
            <CalendarDays className="mx-auto h-10 w-10 text-[#94A3B8]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-[#111827]">No bookable services yet</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-[#64748B]">
              {businessName} hasn&apos;t published any bookable services. Please check back later or
              contact the store directly{tenant.phone ? ` at ${tenant.phone}` : ''}.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section aria-label="Bookable services" className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#64748B]">
                Our services
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {eventTypes.map((ev) => (
                  <article
                    key={ev.id}
                    className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-sm"
                  >
                    <h3 className="text-sm font-bold text-[#111827]">{ev.title}</h3>
                    {ev.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#64748B]">{ev.description}</p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#475569]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#0A6847]" aria-hidden="true" />
                        {ev.duration} min
                      </span>
                      {typeof ev.price === 'number' && ev.price > 0 && (
                        <span className="inline-flex items-center gap-1">
                          {currencySymbol(ev.currency)}
                          {ev.price.toLocaleString('en-IN')}
                          {ev.currency ? ` ${ev.currency}` : ''}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <BookForm
              tenantId={tenant.id}
              tenantSlug={tenant.slug || slug}
              businessName={businessName}
              events={eventTypes.map((e) => ({
                id: e.id,
                title: e.title,
                slug: e.slug,
                duration: e.duration,
                price: e.price,
                currency: e.currency,
              }))}
            />
          </div>
        )}
      </main>
    </div>
  );
}
