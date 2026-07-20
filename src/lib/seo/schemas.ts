/**
 * JSON-LD structured data generators for ServiceOS SEO.
 *
 * These functions return plain objects that are serialized into
 * <script type="application/ld+json"> tags. Google uses this data to
 * understand page content and eligibility for rich results.
 *
 * Reference: https://schema.org / https://developers.google.com/search/docs/appearance/structured-data
 */

const SITE_URL = "https://serviceos.com";
const LOGO_URL = `${SITE_URL}/icon-512.png`;

// ─── Organization schema (site-wide, injected in root layout) ────────────────

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ServiceOS",
    url: SITE_URL,
    logo: LOGO_URL,
    description:
      "ServiceOS is the operating system for service businesses — scheduling, dispatch, invoicing, Email, SMS & Push notifications, and field service management.",
    foundingDate: "2024",
    sameAs: [
      "https://twitter.com/serviceos",
      "https://www.linkedin.com/company/serviceos",
      "https://github.com/deepakxyz562-droid",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/contact-us`,
      availableLanguage: ["English"],
    },
  };
}

// ─── WebSite schema (helps with sitelinks search box) ────────────────────────

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ServiceOS",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

// ─── BreadcrumbList schema ────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── FAQPage schema (eligibility for FAQ rich results) ───────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

export function getFaqSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

// ─── SoftwareApplication schema (for product/feature pages) ──────────────────

export function getSoftwareApplicationSchema(opts: {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: { price: string; priceCurrency: string };
  aggregateRating?: { ratingValue: string; reviewCount: string };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    applicationCategory: opts.applicationCategory ?? "BusinessApplication",
    operatingSystem: opts.operatingSystem ?? "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    offers: {
      "@type": "Offer",
      price: opts.offers?.price ?? "0",
      priceCurrency: opts.offers?.priceCurrency ?? "USD",
    },
    ...(opts.aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: opts.aggregateRating.ratingValue,
            reviewCount: opts.aggregateRating.reviewCount,
          },
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "ServiceOS",
      url: SITE_URL,
    },
  };
}

// ─── Product schema (for pricing pages) ──────────────────────────────────────

export function getProductSchema(opts: {
  name: string;
  description: string;
  url: string;
  brand?: string;
  offers?: { price: string; priceCurrency: string; availability?: string };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description,
    brand: {
      "@type": "Brand",
      name: opts.brand ?? "ServiceOS",
    },
    url: opts.url,
    image: LOGO_URL,
    offers: {
      "@type": "Offer",
      price: opts.offers?.price ?? "0",
      priceCurrency: opts.offers?.priceCurrency ?? "USD",
      availability:
        opts.offers?.availability ??
        "https://schema.org/InStock",
    },
  };
}

// ─── ItemList schema (for "best of" listicle pages) ───────────────────────────

export function getItemListSchema(opts: {
  name: string;
  description: string;
  url: string;
  items: { name: string; url: string; position: number; description?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    itemListElement: opts.items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      url: item.url,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

// ─── LocalBusiness schema (for public business hub pages) ─────────────────────
// The single most important schema type for service-business directory pages.
// Includes address, geo, opening hours, aggregate rating, and reviews.

export interface LocalBusinessHours {
  days: string[];  // ["Monday", "Tuesday", ...]
  opens: string;   // "09:00"
  closes: string;  // "17:00"
}

export interface LocalBusinessReview {
  authorName: string;
  rating: number;       // 1-5
  comment?: string;
  datePublished?: string;  // ISO date
  url?: string;
}

export function getLocalBusinessSchema(opts: {
  name: string;
  description: string;
  url: string;             // canonical URL of the business hub page
  slug: string;            // tenant slug
  industry?: string;       // raw industry string from DB
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  logo?: string;
  coverImage?: string;
  rating?: number;         // aggregate (0-5)
  reviewCount?: number;
  reviews?: LocalBusinessReview[];
  openingHours?: LocalBusinessHours[];
  priceRange?: string;     // "$", "$$", "$$$"
  sameAs?: string[];       // social links
}) {
  // Map industry string → schema.org @type (falls back to LocalBusiness)
  const industryType = mapIndustryToSchemaType(opts.industry);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": industryType,
    "@id": opts.url,
    name: opts.name,
    description: opts.description,
    url: opts.url,
    ...(opts.phone ? { telephone: opts.phone } : {}),
    ...(opts.email ? { email: opts.email } : {}),
    ...(opts.logo ? { logo: opts.logo, image: opts.logo } : {}),
    ...(opts.coverImage && !opts.logo ? { image: opts.coverImage } : {}),
    ...(opts.priceRange ? { priceRange: opts.priceRange } : {}),
    ...(opts.sameAs && opts.sameAs.length > 0 ? { sameAs: opts.sameAs } : {}),
  };

  // Address → PostalAddress
  if (opts.address || opts.city || opts.state || opts.postalCode) {
    const postalAddress: Record<string, string> = { "@type": "PostalAddress" };
    if (opts.address) postalAddress.streetAddress = opts.address;
    if (opts.city) postalAddress.addressLocality = opts.city;
    if (opts.state) postalAddress.addressRegion = opts.state;
    if (opts.postalCode) postalAddress.postalCode = opts.postalCode;
    if (opts.country) postalAddress.addressCountry = opts.country;
    schema.address = postalAddress;
  }

  // Opening hours → OpeningHoursSpecification
  if (opts.openingHours && opts.openingHours.length > 0) {
    schema.openingHoursSpecification = opts.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    }));
  }

  // Aggregate rating
  if (opts.rating && opts.rating > 0 && opts.reviewCount && opts.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(opts.rating),
      reviewCount: String(opts.reviewCount),
      bestRating: "5",
      worstRating: "1",
    };
  }

  // Individual reviews
  if (opts.reviews && opts.reviews.length > 0) {
    schema.review = opts.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.authorName },
      reviewRating: {
        "@type": "Rating",
        ratingValue: String(r.rating),
        bestRating: "5",
        worstRating: "1",
      },
      ...(r.comment ? { reviewBody: r.comment } : {}),
      ...(r.datePublished ? { datePublished: r.datePublished } : {}),
      ...(r.url ? { url: r.url } : {}),
    }));
  }

  // Parent organization (ServiceOS) — makes this a node in the platform graph
  schema.parentOrganization = {
    "@type": "Organization",
    name: "ServiceOS",
    url: SITE_URL,
  };

  return schema;
}

// ─── Service schema (for individual service offerings on a business hub) ──────

export function getServiceSchema(opts: {
  name: string;
  description: string;
  url: string;             // URL of the business hub
  providerName: string;    // business name
  providerUrl?: string;
  serviceType?: string;    // e.g. "Plumbing repair"
  areaServed?: string[];   // list of cities/areas
  offers?: { price: string; priceCurrency: string; description?: string };
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    serviceType: opts.serviceType ?? opts.name,
    provider: {
      "@type": "LocalBusiness",
      name: opts.providerName,
      ...(opts.providerUrl ? { url: opts.providerUrl } : {}),
    },
  };

  if (opts.areaServed && opts.areaServed.length > 0) {
    schema.areaServed = opts.areaServed.map((a) => ({
      "@type": "City",
      name: a,
    }));
  }

  if (opts.offers) {
    schema.offers = {
      "@type": "Offer",
      price: opts.offers.price,
      priceCurrency: opts.offers.priceCurrency,
      ...(opts.offers.description ? { description: opts.offers.description } : {}),
    };
  }

  return schema;
}

// ─── Industry → schema.org @type mapping ──────────────────────────────────────
// Maps the free-form Tenant.industry string to a schema.org business subtype.
// Falls back to "LocalBusiness" when no match is found.

export function mapIndustryToSchemaType(industry?: string | null): string {
  if (!industry) return "LocalBusiness";
  const i = industry.toLowerCase().trim();

  if (i.includes("plumb")) return "Plumber";
  if (i.includes("hvac") || i.includes("air cond") || i.includes("heating") || i.includes("cooling")) return "HVACBusiness";
  if (i.includes("electric")) return "Electrician";
  if (i.includes("clean")) return "LocalBusiness"; // schema.org has no CleaningService subtype
  if (i.includes("pest")) return "PestControl";
  if (i.includes("mov")) return "MovingCompany";
  if (i.includes("landscape") || i.includes("lawn") || i.includes("garden")) return "Landscaper";
  if (i.includes("roof")) return "RoofingContractor";
  if (i.includes("paint")) return "HousePainter";
  if (i.includes("auto") || i.includes("car") || i.includes("mechanic")) return "AutoRepair";
  if (i.includes("salon") || i.includes("spa") || i.includes("beauty")) return "HealthAndBeautyBusiness";
  if (i.includes("pet") || i.includes("vet") || i.includes("groom")) return "PetStore";
  if (i.includes("food") || i.includes("restaurant") || i.includes("cater")) return "FoodEstablishment";
  if (i.includes("photo")) return "Photograph";
  if (i.includes("tutor") || i.includes("education") || i.includes("teach")) return "EducationalOrganization";

  return "LocalBusiness";
}

// ─── Industry → URL slug mapping ──────────────────────────────────────────────
// Maps the free-form Tenant.industry string to a URL-safe slug used in
// /{industry}/{city}/{slug} routes.

export function mapIndustryToUrlSlug(industry?: string | null): string {
  if (!industry) return "general";
  const i = industry.toLowerCase().trim();

  if (i.includes("plumb")) return "plumber";
  if (i.includes("hvac") || i.includes("air cond") || i.includes("heating") || i.includes("cooling")) return "hvac";
  if (i.includes("electric")) return "electrician";
  if (i.includes("clean")) return "cleaning";
  if (i.includes("pest")) return "pest-control";
  if (i.includes("mov")) return "movers";
  if (i.includes("landscape") || i.includes("lawn") || i.includes("garden")) return "landscaping";
  if (i.includes("roof")) return "roofing";
  if (i.includes("paint")) return "painting";
  if (i.includes("auto") || i.includes("car") || i.includes("mechanic")) return "auto-repair";
  if (i.includes("salon") || i.includes("spa") || i.includes("beauty")) return "salon";
  if (i.includes("pet") || i.includes("vet") || i.includes("groom")) return "pet-care";
  if (i.includes("food") || i.includes("restaurant") || i.includes("cater")) return "catering";
  if (i.includes("photo")) return "photography";
  if (i.includes("tutor") || i.includes("education") || i.includes("teach")) return "tutoring";
  if (i.includes("handyman") || i.includes("handy")) return "handyman";

  // Fallback: slugify the industry string itself
  return i.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "general";
}

// ─── City → URL slug helper ───────────────────────────────────────────────────

export function slugifyCity(city?: string | null): string {
  if (!city) return "unknown";
  return city.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}
