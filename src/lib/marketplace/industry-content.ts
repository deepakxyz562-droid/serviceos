/**
 * industry-content.ts — Evergreen, industry-specific content generators.
 * -----------------------------------------------------------------------
 * Used by the marketplace detail page (src/app/[companySlug]/[city]/[slug]/)
 * to render ALWAYS-PRESENT content sections that don't depend on the
 * business owner having filled in their profile.
 *
 * Why this exists:
 *   Most marketplace detail pages were "thin" — the About, Services,
 *   Gallery, Reviews, and FAQs sections are all conditional on the
 *   business owner having entered that data. For unclaimed / seed /
 *   expired-trial listings, ALL of those sections vanish and the page
 *   collapses to Hero → Trust badges → Similar → footer. Google treats
 *   such pages as "thin content" and demotes them.
 *
 *   This module generates genuinely useful, evergreen, indexable content
 *   from `industry + city + country` alone — so every listing has real
 *   depth, whether the business is claimed or not.
 *
 * Content quality principles (IMPORTANT — do not violate):
 *   1. Specific, not generic. "Check EPA 608 certification" beats
 *      "check their credentials".
 *   2. Real terminology. Use the actual licence / certification names
 *      a tradesperson in that industry would recognise.
 *   3. Evergreen. No time-sensitive references ("this year", "currently").
 *   4. No false claims about specific businesses. The about-paragraph is
 *      about the INDUSTRY in that CITY, never about the specific provider.
 *   5. Information-dense. ~120-150 words for the about paragraph, not
 *      padded fluff. Google's Helpful Content Update penalises filler.
 */

import { getIndustryDisplayName as getBroadIndustryDisplayName } from '@/lib/seo/industry-software-pages'

export interface HiringChecklistItem {
  title: string
  description: string
}

export interface PlatformFaq {
  question: string
  answer: string
}

/**
 * A "common service" in this category — e.g. "Interior Window Cleaning",
 * "Exterior Window Cleaning". Used by the CommonServices section on the
 * detail page to show category-level service cards clearly labeled as
 * "common in this category, not necessarily offered by this business".
 *
 * When the 3-state verification feature ships later, these cards become
 * the foundation that transitions between:
 *   🟡 Publicly reported  →  🔵 Business claimed  →  🟢 Fieseros verified
 */
export interface CommonService {
  name: string
  description: string
}

interface IndustryContent {
  /** Returns an ~120-150 word paragraph about hiring this industry in `city`. */
  aboutParagraph: (city: string, country: string) => string
  /** 4-6 hiring checklist items specific to this industry. */
  hiringChecklist: HiringChecklistItem[]
  /** Returns 3 platform-level FAQs for this industry in `city`. */
  platformFaqs: (city: string) => PlatformFaq[]
}

/**
 * A sub-industry match — e.g. "window cleaning" detected inside the broad
 * "cleaning" industry. When a sub-industry is detected, its (more specific)
 * content overrides the broad industry content. This fixes the bug where a
 * Window Cleaning business was shown generic house-cleaning content.
 */
interface SubIndustryMatch {
  /** The sub-industry key (e.g. 'window-cleaning', 'carpet-cleaning'). */
  key: string
  /** The full IndustryContent for this sub-industry. */
  content: IndustryContent
}

// ── Per-industry content ────────────────────────────────────────────────────

const HVAC_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Finding a reliable HVAC technician in ${city} matters more than most homeowners realise — a poorly serviced furnace or undercharged AC unit can quietly add 20–30% to your energy bills. A qualified HVAC contractor handles heating, ventilation, and air conditioning work including annual tune-ups, emergency furnace repair, central AC installation, heat pump replacement, and indoor air quality assessments. When comparing providers, look for EPA Section 608 certification (required for refrigerant handling), proof of liability insurance, and written estimates that itemise labour, parts, and warranty terms. Fieseros lists HVAC businesses serving ${city} and the surrounding area, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Verify EPA Section 608 certification',
      description:
        'Federal law requires anyone handling refrigerants to hold an EPA Section 608 card. Ask to see the technician’s card before they start work — no exceptions.',
    },
    {
      title: 'Confirm liability insurance',
      description:
        'Covers property damage if a technician damages your HVAC system, ductwork, or home during service. Ask for the insurance carrier name and policy number.',
    },
    {
      title: 'Get an itemised written estimate',
      description:
        'Labour, parts, refrigerant, and disposal fees should be listed separately so you can compare quotes line-by-line. Avoid flat "system replacement" quotes with no breakdown.',
    },
    {
      title: 'Ask about equipment warranties',
      description:
        'Most furnaces and AC units come with 10-year parts warranties from the manufacturer; the installer’s labour warranty typically runs 1–2 years. Get both in writing.',
    },
    {
      title: 'Check emergency response time',
      description:
        'HVAC failures in peak summer or winter can be dangerous. Confirm the provider’s after-hours policy and typical response window before you actually need it.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know an HVAC provider on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation. You can click any badge to see exactly what was verified.',
    },
    {
      question: `What should I ask an HVAC technician in ${city} before hiring them?`,
      answer:
        'Ask about their EPA Section 608 certification (required for refrigerant work), proof of liability insurance, written estimates, equipment warranties, and emergency availability. The “What to expect when hiring” section above lists the full checklist with explanations.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the work.',
    },
  ],
}

const PLUMBING_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `A trustworthy plumber in ${city} is the difference between a five-minute fix and a flooded basement. Professional plumbing contractors handle everything from dripping taps and running toilets to whole-house repipes, water heater installation, sewer line camera inspection, and emergency burst-pipe repair. When hiring, ask whether the plumber is licensed in your state (most US states require a Journeyman or Master Plumber licence), carries liability insurance, and offers a written warranty on parts and labour. Watch for red flags: quotes given over the phone without seeing the job, pressure to pay in cash, or refusal to provide a written estimate. Fieseros lists plumbers serving ${city}, with each provider’s verification status — identity, business, insurance, and licensing — visible on their profile so you can hire with confidence.`,
  hiringChecklist: [
    {
      title: 'Verify state licensure',
      description:
        'Most US states require a Journeyman or Master Plumber licence. Ask for the licence number and verify it on your state contractor board’s website before work begins.',
    },
    {
      title: 'Confirm liability insurance',
      description:
        'Covers water damage if a repair fails or a pipe bursts during work. Plumbers should carry at least $1M general liability — ask for a certificate of insurance.',
    },
    {
      title: 'Get a written estimate before work starts',
      description:
        'Ask whether the quote is flat-rate or time-and-materials, and what triggers a change order. Avoid any plumber who refuses to put the estimate in writing.',
    },
    {
      title: 'Ask about warranty on parts and labour',
      description:
        'Quality plumbers typically guarantee their workmanship for 1–2 years. Manufacturer warranties on parts (water heaters, fixtures) vary — get the warranty document before paying.',
    },
    {
      title: 'Confirm emergency availability',
      description:
        'Burst pipes don’t wait for business hours. Ask about after-hours rates, weekend coverage, and typical response time before an emergency forces a rushed decision.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a plumber on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a plumber in ${city} before hiring them?`,
      answer:
        'Ask for their state licence number, proof of liability insurance, a written estimate (flat-rate or time-and-materials), warranty on parts and labour, and emergency availability. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the work.',
    },
  ],
}

const ELECTRICAL_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Electrical work is one area where DIY is genuinely dangerous — faulty wiring causes an estimated 51,000 home fires each year in the US alone. A licensed electrician in ${city} handles panel upgrades, outlet and switch installation, whole-house rewiring, EV charger installation, lighting design, and emergency fault diagnosis. When hiring, verify the electrician holds a state-issued Master or Journeyman licence (requirements vary by state but all 50 states licence electricians), carries liability insurance, and pulls permits for work that requires inspection. Beware of contractors who want to skip the permit process — it’s a red flag for both code compliance and insurance coverage. Fieseros lists electricians serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Verify state electrical licence',
      description:
        'All 50 US states licence electricians (Master or Journeyman). Ask for the licence number and verify it on your state’s electrical board website. Unlicensed electrical work is illegal in most jurisdictions and voids homeowners insurance.',
    },
    {
      title: 'Confirm liability insurance',
      description:
        'Electrical work carries fire risk. The electrician should carry at least $1M general liability and ideally workers’ comp if they have employees. Ask for a certificate of insurance.',
    },
    {
      title: 'Insist on permits for major work',
      description:
        'Panel upgrades, new circuits, and rewiring require permits and inspection in most jurisdictions. A contractor who wants to "skip the permit" is a red flag — the work won’t be insurable or saleable later.',
    },
    {
      title: 'Get a written estimate with parts + labour',
      description:
        'Electrical estimates should itemise fixtures, wire, panels, and labour separately. Avoid contractors who give a single lump-sum number with no breakdown.',
    },
    {
      title: 'Ask about warranty and follow-up',
      description:
        'Quality electricians guarantee workmanship for 1–5 years. Manufacturer warranties on panels, breakers, and fixtures are separate — make sure you receive both warranty documents.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know an electrician on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask an electrician in ${city} before hiring them?`,
      answer:
        'Ask for their state licence number (Master or Journeyman), proof of liability insurance, whether they pull permits, a written estimate itemising parts and labour, and warranty coverage. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the work.',
    },
  ],
}

const CLEANING_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Hiring a professional cleaning service in ${city} frees up 4–8 hours of your week and ensures a level of consistency that ad-hoc cleaning rarely achieves. Reputable cleaning companies handle regular residential cleaning, deep cleans, move-in/move-out cleans, post-construction cleaning, and commercial janitorial work. When comparing providers, ask whether cleaners are employees or 1099 contractors (employees mean the company handles training, background checks, and payroll taxes; contractors shift that liability onto you), whether they carry liability insurance and bonding, and what products they use — eco-friendly options matter if anyone in your household has allergies or chemical sensitivities. Fieseros lists cleaning businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Employees vs. contractors',
      description:
        'Companies that employ their cleaners (W-2) handle background checks, training, and payroll taxes themselves. Companies using 1099 contractors shift that liability onto you — the homeowner — in some states.',
    },
    {
      title: 'Confirm liability insurance + bonding',
      description:
        'Liability insurance covers property damage; bonding covers theft. Ask for a certificate of insurance — legitimate cleaning companies carry both and will email it without hesitation.',
    },
    {
      title: 'Ask about products and equipment',
      description:
        'If anyone in your household has allergies or pets, confirm the products used are safe. Some companies bring their own equipment (vacuum, mop); others expect you to supply it. Clarify before the first visit.',
    },
    {
      title: 'Get a written scope of work',
      description:
        'A reputable cleaner hands you a checklist of what’s included in a "standard clean" vs. a "deep clean". Avoid companies that quote a price without specifying what gets cleaned.',
    },
    {
      title: 'Check background-check policy',
      description:
        'Cleaners enter your home — confirm the company runs criminal background checks on all employees. Ask which screening service they use and how recent the checks are.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a cleaning service on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a cleaning service in ${city} before hiring them?`,
      answer:
        'Ask whether cleaners are W-2 employees or 1099 contractors, whether the company carries liability insurance and bonding, what products they use, what’s included in a standard clean, and whether they run background checks. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the service.',
    },
  ],
}

const LANDSCAPING_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `A skilled landscaper in ${city} does more than mow lawns — they design outdoor spaces that hold value, manage stormwater, and survive the local climate. Professional landscaping companies handle lawn maintenance, garden design and planting, irrigation system installation, hardscaping (patios, retaining walls, walkways), tree trimming, and seasonal cleanups. When hiring, ask whether the company holds a state landscaper licence (required in some states for jobs over a certain dollar threshold), carries liability insurance for property damage, and has workers’ comp coverage for crews on your property. Get a written design plan and itemised quote before any dirt is moved — vague "we’ll make it look nice" quotes lead to budget blowouts. Fieseros lists landscaping businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Check state landscaper licence',
      description:
        'Some US states require a landscaper licence for jobs over a dollar threshold (often $500–$1,000). Verify the licence number on your state contractor board’s website.',
    },
    {
      title: 'Confirm liability insurance + workers’ comp',
      description:
        'Landscaping crews use heavy equipment. Liability insurance covers property damage (e.g. a tree falling on your roof); workers’ comp covers injuries to crew members on your property — without it, you could be liable.',
    },
    {
      title: 'Get a written design plan + itemised quote',
      description:
        'For any job over a few hundred dollars, insist on a written plan listing plants, materials, labour, and timeline. Avoid contractors who quote a single lump-sum number with no breakdown.',
    },
    {
      title: 'Ask about plant warranties',
      description:
        'Reputable landscapers guarantee new plantings for 6–12 months. Get the warranty in writing — without it, you’re eating the cost of any plant that dies after installation.',
    },
    {
      title: 'Confirm cleanup + disposal is included',
      description:
        'Some landscapers leave clippings, branches, and debris on-site; others haul everything away. Clarify what’s included in the quoted price before work begins.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a landscaper on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a landscaper in ${city} before hiring them?`,
      answer:
        'Ask whether they hold a state landscaper licence, whether they carry liability insurance and workers’ comp, request a written design plan and itemised quote, ask about plant warranties, and confirm cleanup is included. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the work.',
    },
  ],
}

const ROOFING_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `A new roof is one of the largest single investments a homeowner will make — and a bad installation can leak for years before anyone notices the damage. A licensed roofing contractor in ${city} handles roof inspections, leak repair, full roof replacement, gutter installation, skylight fitting, and storm damage assessment. When hiring, verify the roofer holds a state roofing licence (required in most states for jobs over $500), carries both liability insurance and workers’ comp (roofing has one of the highest workplace injury rates in construction), and offers a manufacturer-backed warranty on materials plus a separate workmanship warranty on installation. Beware of storm-chasers who knock on your door after hail — many are out-of-state contractors who vanish when warranty claims arise. Fieseros lists roofing businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Verify state roofing licence',
      description:
        'Most US states require a roofing contractor licence for jobs over $500. Ask for the licence number and verify it on your state contractor board’s website. Out-of-state storm-chasers often work unlicensed.',
    },
    {
      title: 'Confirm liability insurance + workers’ comp',
      description:
        'Roofing has one of the highest workplace injury rates in construction. Without workers’ comp, an injured roofer can sue the homeowner. Demand a certificate of insurance before any work begins.',
    },
    {
      title: 'Get both material AND workmanship warranties',
      description:
        'Manufacturer warranties cover shingles/materials (typically 20–50 years). Workmanship warranties cover the installation (typically 1–10 years). A "lifetime warranty" sales pitch usually means neither — get both in writing.',
    },
    {
      title: 'Avoid door-to-door storm-chasers',
      description:
        'Roofers who knock on your door after a hailstorm are often out-of-state contractors who vanish when warranty claims arise. Always verify a permanent local business address and check online reviews.',
    },
    {
      title: 'Insist on a written contract + lien waiver',
      description:
        'The contract should specify materials, labour, timeline, payment schedule, and cleanup. A final lien waiver (released when you make the final payment) protects you from supplier liens if the roofer doesn’t pay their suppliers.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a roofer on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a roofer in ${city} before hiring them?`,
      answer:
        'Ask for their state roofing licence number, proof of liability insurance and workers’ comp, both material and workmanship warranties, a permanent local business address, and a written contract with a lien waiver. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the work.',
    },
  ],
}

const PEST_CONTROL_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Pest control in ${city} isn’t just about comfort — untreated infestations can damage your property’s structure (termites cause an estimated $5bn in US property damage annually) and pose real health risks (rodents, cockroaches, and bed bugs all carry pathogens). Professional pest control companies handle termite treatment, rodent control, bed bug heat treatment, wasp and bee removal, mosquito abatement, and preventive quarterly treatments. When hiring, verify the technician holds a state pesticide applicator licence (required in all 50 states for commercial pesticide application), confirm the company carries liability insurance, and ask which products will be used — reputable operators provide EPA product labels and material safety data sheets on request. Fieseros lists pest control businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Verify state pesticide applicator licence',
      description:
        'All 50 US states require a commercial pesticide applicator licence. Ask for the licence number and verify it on your state’s Department of Agriculture or pesticide regulation website.',
    },
    {
      title: 'Ask which products will be used',
      description:
        'Reputable operators provide EPA product labels and Safety Data Sheets (SDS) on request. If anyone in your household has pets, children, or chemical sensitivities, confirm the products are safe for re-entry after the recommended drying time.',
    },
    {
      title: 'Confirm liability insurance',
      description:
        'Covers property damage or contamination if a treatment goes wrong (e.g. overspray damaging plants or finishes). Pest control companies should carry at least $1M general liability.',
    },
    {
      title: 'Get a written treatment plan',
      description:
        'The plan should specify the target pest, treatment method, products used, follow-up schedule, and what you need to do (vacate, cover food, etc.). Avoid companies that quote a price without inspecting the property first.',
    },
    {
      title: 'Beware of "one and done" guarantees',
      description:
        'Most infestations (termites, bed bugs, rodents) require multi-visit protocols. A single-treatment "lifetime guarantee" is a sales red flag — legitimate pest control is iterative.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a pest control company on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a pest control company in ${city} before hiring them?`,
      answer:
        'Ask for their state pesticide applicator licence number, which products will be used (request EPA labels and SDS sheets), proof of liability insurance, a written treatment plan, and the follow-up schedule. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the treatment.',
    },
  ],
}

const PAINTING_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `A professional paint job in ${city} should last 7–10 years on exterior walls and 5–7 years indoors — DIY jobs typically need redoing in half that time. Professional painting contractors handle interior wall and ceiling painting, exterior siding and trim, cabinet refinishing, deck staining, and specialty finishes (limewash, Venetian plaster, faux finishes). When hiring, ask whether the painter is licensed (required in many states for jobs over $500), carries liability insurance (paint spills and overspray cause real damage), and uses premium paint lines (Sherwin-Williams Duration, Benjamin Moore Aura, Behr Marquee — not contractor-grade). Get a written quote that itemises prep work (scraping, sanding, priming, caulking) — surface prep is 60–70% of a quality paint job, and skipping it is the #1 reason paint fails early. Fieseros lists painting businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Verify contractor licence (if required)',
      description:
        'Many US states require a painting contractor licence for jobs over $500. Ask for the licence number and verify it on your state contractor board’s website.',
    },
    {
      title: 'Confirm liability insurance',
      description:
        'Paint spills, overspray, and ladder damage can ruin floors, furniture, and landscaping. The painter should carry at least $1M general liability — ask for a certificate of insurance.',
    },
    {
      title: 'Ask which paint line will be used',
      description:
        'Premium lines (Sherwin-Williams Duration, Benjamin Moore Aura, Behr Marquee) last 2–3× longer than contractor-grade paint. Specify the product in the contract — "premium exterior paint" is meaningless.',
    },
    {
      title: 'Get an itemised prep-work quote',
      description:
        'Surface prep (scraping, sanding, priming, caulking, patching) is 60–70% of a quality paint job. A quote that lists "prep" as a single line item is hiding what gets skipped — get the breakdown.',
    },
    {
      title: 'Confirm cleanup + paint disposal',
      description:
        'The quote should specify daily cleanup, furniture moving, floor protection, and hazardous-waste disposal for oil-based paints. Avoid contractors who leave empty cans and dirty rollers for you to deal with.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a painter on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a painter in ${city} before hiring them?`,
      answer:
        'Ask whether they hold a state contractor licence, proof of liability insurance, which specific paint line they’ll use, an itemised prep-work quote, and cleanup + paint disposal policy. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the work.',
    },
  ],
}

const AUTO_REPAIR_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Finding an honest auto mechanic in ${city} can save you thousands over the life of a vehicle — the average US household spends $9,000+ on car maintenance and repairs over a 15-year ownership period. Professional auto repair shops handle oil changes, brake service, transmission repair, engine diagnostics, tyre rotation and replacement, AC recharge, and pre-purchase inspections. When hiring, look for ASE (National Institute for Automotive Service Excellence) certification — a real shop will display technician certifications on the wall and on their website. Ask whether the shop provides written estimates before work begins (required by law in many states), uses OEM vs. aftermarket parts, and offers a warranty on parts and labour. Fieseros lists auto repair businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Look for ASE certification',
      description:
        'ASE (National Institute for Automotive Service Excellence) is the industry-standard mechanic certification. Look for the blue ASE logo — real shops display technician certifications on the wall and website.',
    },
    {
      title: 'Get a written estimate before work begins',
      description:
        'Many US states require shops to provide a written estimate before work starts and to obtain your approval before exceeding it. Never authorise work verbally without a written quote.',
    },
    {
      title: 'Ask OEM vs. aftermarket parts',
      description:
        'OEM (Original Equipment Manufacturer) parts match the factory spec; aftermarket parts are cheaper but quality varies. Specify which you want in writing — some shops swap OEM for cheap aftermarket without telling you.',
    },
    {
      title: 'Confirm warranty on parts and labour',
      description:
        'Quality shops warranty parts for 12 months / 12,000 miles minimum (many go 24/24). Get the warranty in writing — verbal "don’t worry, we’ll fix it" isn’t enforceable.',
    },
    {
      title: 'Watch for "free diagnostic" bait',
      description:
        'Some shops offer free diagnostics then pressure you to authorize the repair on the spot. Get the diagnostic in writing and take it to a second shop if the quote feels high — reputable shops welcome second opinions.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know an auto repair shop on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask an auto mechanic in ${city} before hiring them?`,
      answer:
        'Ask about ASE certification, written estimates, OEM vs. aftermarket parts, warranty on parts and labour, and diagnostic fees. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the repair.',
    },
  ],
}

const LOCKSMITH_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Locksmithing is one of the most scam-prone trades in the US — fake "local" locksmiths routinely advertise $15 service calls, then show up and charge $300+ for a 5-minute job. A legitimate locksmith in ${city} handles lockout service (home, auto, business), lock installation and rekeying, smart lock fitting, safe opening, master key systems, and automotive key programming. When hiring, verify the locksmith is licensed (13 US states require a locksmith licence: AL, CA, CT, IL, LA, MD, NJ, NC, NV, OK, OR, TN, TX, VA), carries liability insurance, and provides a written quote BEFORE drilling or picking. The #1 red flag: a quote that doubles when the technician arrives. Fieseros lists locksmith businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Verify state locksmith licence (if required)',
      description:
        '13 US states require a locksmith licence (AL, CA, CT, IL, LA, MD, NJ, NC, NV, OK, OR, TN, TX, VA). Ask for the licence number and verify it on your state’s licensing website.',
    },
    {
      title: 'Get a written quote BEFORE work begins',
      description:
        'The #1 locksmith scam: a $15 phone quote that becomes $300 when the technician arrives. Insist on a written quote before drilling or picking — and refuse service if the price changes on arrival.',
    },
    {
      title: 'Confirm liability insurance',
      description:
        'Lock drilling and forced entry can damage doors, frames, and locks. The locksmith should carry liability insurance covering any property damage during service.',
    },
    {
      title: 'Beware "call centre" locksmiths',
      description:
        'Many "local locksmiths" are national call centres that dispatch unvetted subcontractors. Verify a real local business address (use street view) and ask whether the technician is a direct employee.',
    },
    {
      title: 'Ask about lock brand + key duplication',
      description:
        'Quality locksmiths use brand-name locks (Schlage, Kwikset, Mul-T-Lock, Medeco) and can cut duplicate keys on-site. Avoid anyone installing no-name generic hardware — it’s usually marked up 5–10×.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a locksmith on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a locksmith in ${city} before hiring them?`,
      answer:
        'Ask whether they hold a state locksmith licence (required in 13 states), get a written quote before work begins, confirm liability insurance, verify a real local business address, and ask about lock brands. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the service.',
    },
  ],
}

const HANDYMAN_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `A reliable handyman in ${city} is the homeowner’s secret weapon — the right person for the 50 small jobs that don’t justify a specialist contractor but pile up fast: leaky taps, squeaky doors, loose banisters, patching drywall, mounting TVs, replacing light fixtures, and assembling flat-pack furniture. When hiring, ask whether the handyman is licensed (most US states require a contractor licence for jobs over $500 — a "handyman exemption" usually caps individual jobs at $300–$500), carries liability insurance, and provides a written quote for any job over a few hours. Beware of cash-only operators who won’t put anything in writing — that’s a liability nightmare if something goes wrong. Fieseros lists handyman businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Check state handyman licence limits',
      description:
        'Most US states have a "handyman exemption" that caps individual jobs at $300–$500 without a contractor licence. For larger jobs, the handyman must hold a state contractor licence — verify it on your state board’s website.',
    },
    {
      title: 'Confirm liability insurance',
      description:
        'Even small jobs cause damage (a mis-drilled hole in a water pipe, a fallen ladder). The handyman should carry at least $500K general liability — ask for a certificate of insurance.',
    },
    {
      title: 'Get a written quote for jobs over 2 hours',
      description:
        'For anything beyond a quick fix, get a written quote with hourly rate, estimated hours, materials, and a "not to exceed" cap. Cash-only operators who refuse to write anything down are a red flag.',
    },
    {
      title: 'Ask about specialty trade limits',
      description:
        'Handymen legally cannot do electrical, plumbing, or HVAC work in most states without the relevant trade licence. If a job needs trade work, hire the specialist — not the handyman.',
    },
    {
      title: 'Confirm cleanup is included',
      description:
        'The quote should specify whether the handyman hauls away debris, old fixtures, and packaging. Many leave cleanup to the homeowner — clarify before booking.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a handyman on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a handyman in ${city} before hiring them?`,
      answer:
        'Ask about their state handyman licence limits, proof of liability insurance, a written quote with hourly rate and "not to exceed" cap, whether they can do trade work (electrical/plumbing/HVAC), and whether cleanup is included. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the work.',
    },
  ],
}

const SALON_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `A skilled salon or beauty professional in ${city} doesn’t just make you look good — they protect your skin, hair, and nails from long-term damage that cheap operators cause. Professional salons and beauty businesses handle haircuts and colouring, facials and skin treatments, manicures and pedicures, waxing, threading, makeup application, and specialised treatments like keratin smoothing or lash extensions. When choosing a salon, ask whether technicians hold state cosmetology or esthetics licences (required in all 50 US states — the licence should be displayed at the workstation), whether tools are properly sanitised between clients (UV sterilisers and Barbicide are the standard), and which product lines they use. Fieseros lists salon and beauty businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Verify state cosmetology / esthetics licence',
      description:
        'All 50 US states licence cosmetologists, estheticians, and nail technicians. The licence should be displayed at the workstation — if it’s not visible, ask. Unlicensed operators are a health hazard.',
    },
    {
      title: 'Check tool sanitisation',
      description:
        'Salons should sanitise tools between every client using Barbicide (for combs/scissors) or UV sterilisers (for metal tools). Nail files, buffers, and foot files should be single-use or handed back to you for next time.',
    },
    {
      title: 'Ask about product lines',
      description:
        'Premium salons use professional product lines (Olaplex, Redken, Wella, Aveda, Dermalogica). Salons using only drugstore products and charging premium prices are cutting corners.',
    },
    {
      title: 'Confirm patch tests for chemical services',
      description:
        'Reputable salons require a patch test 24–48 hours before colour services, lash extensions, or chemical peels — skipping this step risks severe allergic reactions.',
    },
    {
      title: 'Read recent reviews + check consistency',
      description:
        'Look at reviews from the last 3 months — salons with great reviews from 2 years ago but recent complaints often have new staff or quality issues. Consistency matters more than peak performance.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a salon or beauty professional on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a salon in ${city} before booking?`,
      answer:
        'Ask whether technicians hold state cosmetology or esthetics licences, how tools are sanitised between clients, which product lines they use, whether patch tests are required for chemical services, and read recent reviews for consistency. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote or booking through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed.',
    },
  ],
}

const PET_CARE_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Choosing a pet care provider in ${city} is a decision most owners take as seriously as choosing a paediatrician — and rightly so. Professional pet care businesses handle dog walking, pet sitting, boarding, grooming, dog training, and veterinary support services. When hiring, ask whether the provider is bonded and insured (pet sitters and dog walkers should carry liability coverage for pet injuries and property damage), whether staff are certified (Pet Sitters International, NAPPS, or CCPDT for trainers), and what their emergency protocol is — a real provider has a written plan covering vet emergencies, natural disasters, and pet escape. For boarding, ask to tour the facility in person and check temperature control, sanitation, and staff-to-pet ratios. Fieseros lists pet care businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Confirm bonding + liability insurance',
      description:
        'Pet sitters and dog walkers should carry liability insurance (covers pet injuries and property damage) and bonding (covers theft). Ask for the certificate — reputable providers carry both.',
    },
    {
      title: 'Check professional certifications',
      description:
        'Look for Pet Sitters International (PSI), NAPPS (for sitters), or CCPDT (for dog trainers). Certifications aren’t legally required but they signal commitment to professional standards.',
    },
    {
      title: 'Ask about emergency protocol',
      description:
        'A real provider has a written plan: which vet they use for emergencies, how they reach you, what happens in a natural disaster, and what happens if the pet escapes. Vague "we’ll figure it out" answers are a red flag.',
    },
    {
      title: 'Tour boarding facilities in person',
      description:
        'For boarding, visit before booking. Check temperature control, sanitation, separation of dogs by size/temperament, staff-to-pet ratios, and outdoor play areas. Photos on a website aren’t a substitute.',
    },
    {
      title: 'Confirm vaccination requirements',
      description:
        'Reputable providers require proof of core vaccinations (rabies, DHPP, bordetella for dogs; FVRCP for cats) before accepting a pet. A provider that skips vaccination checks is putting every animal in their care at risk.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a pet care provider on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a pet care provider in ${city} before hiring them?`,
      answer:
        'Ask about bonding and liability insurance, professional certifications (PSI, NAPPS, CCPDT), emergency protocol, tour the boarding facility in person, and confirm vaccination requirements. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the service.',
    },
  ],
}

const MOVERS_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Hiring movers in ${city} is one of those services where the cheapest quote usually costs the most in the end — damaged furniture, surprise fuel charges, and "the truck is too full, that’ll be $400 extra" bait-and-switch are endemic in the moving industry. Professional movers handle local and long-distance residential moves, commercial relocations, packing services, furniture disassembly and reassembly, and specialty item transport (pianos, antiques, safes). When hiring, verify the mover holds a US DOT number (required for interstate moves) and a state PUC licence (required for intrastate moves in most states), carries full-value protection insurance (not just the free 60-cents-per-pound minimum), and provides a binding written estimate — not a non-binding one that can balloon on moving day. Fieseros lists moving businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Verify US DOT + state PUC licence',
      description:
        'Interstate movers need a US DOT number (verify at fmcsa.dot.gov). Intrastate movers need a state PUC licence. Ask for both numbers — unlicensed movers operate outside the law and your belongings have no protection.',
    },
    {
      title: 'Insist on full-value protection insurance',
      description:
        'Federal law requires movers to offer 60-cents-per-pound coverage for free — that’s $30 for a 50-lb TV. Pay for full-value protection (typically 1–2% of declared value) so damaged items are actually replaced.',
    },
    {
      title: 'Get a BINDING written estimate',
      description:
        'A "binding" estimate locks in the price. A "non-binding" estimate can balloon on moving day — many scams work this way. Insist on binding, in writing, with all fees itemised.',
    },
    {
      title: 'Beware cash-only + deposits over 20%',
      description:
        'Legitimate movers accept credit cards (chargeback protection for you). Cash-only is a scam red flag. Deposits over 20% of the estimated total are also unusual — most reputable movers take payment on delivery.',
    },
    {
      title: 'Confirm inventory + condition forms',
      description:
        'The mover should complete a written inventory of your belongings with condition notes before loading. Without this, you cannot prove damage in a claim. Photograph high-value items before the crew arrives.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a mover on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a mover in ${city} before hiring them?`,
      answer:
        'Ask for their US DOT number and state PUC licence, insist on full-value protection insurance (not the free 60-cents-per-pound minimum), get a binding written estimate, avoid cash-only operators, and confirm inventory + condition forms. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the move.',
    },
  ],
}

// ── Generic fallback (for unmapped industries) ──────────────────────────────

// ── Sub-industries (cleaning) ───────────────────────────────────────────────
//
// The broad "cleaning" industry covers very different trades: window cleaning,
// carpet cleaning, pressure washing, gutter cleaning, house cleaning, etc.
// Showing generic house-cleaning content on a Window Cleaning business page
// is a real content-accuracy bug. These sub-industry blocks override the broad
// CLEANING_CONTENT when the business name / tagline signals a sub-specialty.
//
// Detection happens in `detectSubIndustry()` below — scans business name +
// tagline for keywords (window, carpet, pressure, gutter).

const WINDOW_CLEANING_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Hiring a professional window cleaning service in ${city} keeps your glass clear, extends the life of your windows by removing corrosive grime, and reaches high or hard-to-access windows safely. Window cleaning providers typically offer interior and exterior glass cleaning, screen cleaning, frame and track cleaning, and hard-water stain removal — and many also handle related exterior work like pressure washing, gutter cleaning, and roof or solar-panel cleaning. When comparing providers, ask whether they carry liability insurance (working at height carries real risk), whether they bring their own purified-water equipment or expect water access on-site, and whether they offer a streak-free guarantee. Fieseros lists window cleaning businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Confirm liability insurance',
      description:
        'Window cleaning involves ladders, lifts, and working at height — a real fall risk. The provider should carry general liability insurance covering both worker injury and property damage. Ask for the insurance carrier name and policy number.',
    },
    {
      title: 'Ask what\'s included in the quoted price',
      description:
        'Clarify whether screens, tracks, frames, sills, and hard-water stain removal are included or cost extra. Vague "window cleaning" quotes often cover only the glass itself — get the scope in writing.',
    },
    {
      title: 'Check equipment + water-source policy',
      description:
        'Professional window cleaners typically bring their own purified-water-fed pole systems (no spots). If they expect to use your water, confirm access. High-rise work may require lift equipment — confirm the provider has it.',
    },
    {
      title: 'Ask about hard-water + stain removal',
      description:
        'Sprinkler overspray and mineral deposits etch glass over time. Ask whether the provider offers chemical stain removal (typically an add-on) and whether they warranty the result — some stains can\'t be fully removed.',
    },
    {
      title: 'Get a written estimate + frequency guidance',
      description:
        'A reputable cleaner quotes per window or per pane (not a flat "house call" rate) and recommends a cleaning frequency (quarterly / biannual / annual) based on your environment. Avoid providers who quote without seeing the windows.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a window cleaning service on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green "Confirmed" badge means we\'ve independently checked that credential; "Pending" means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a window cleaner in ${city} before hiring them?`,
      answer:
        'Ask about liability insurance (height work is risky), what\'s included in the quoted price (screens, tracks, frames, stain removal), what equipment they bring, hard-water stain removal options, and recommended cleaning frequency. The "Before hiring" section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there\'s no middleman fee, no commission, and no obligation to proceed with the service.',
    },
  ],
}

const CARPET_CLEANING_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Professional carpet cleaning in ${city} removes ground-in dirt, allergens, and stains that regular vacuuming leaves behind — and extends the life of your carpet by years. Carpet cleaning providers typically offer hot-water extraction (steam cleaning), dry cleaning, stain and pet-odour treatment, upholstery cleaning, and rug cleaning. When comparing providers, ask which method they use (hot-water extraction is the industry standard recommended by most carpet manufacturers), whether they move furniture or expect you to clear the room, and how long the carpet will take to dry (typically 6–12 hours for steam, 1–2 hours for dry cleaning). Fieseros lists carpet cleaning businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Ask which cleaning method they use',
      description:
        'Hot-water extraction (steam cleaning) is the industry standard recommended by most carpet manufacturers. Dry cleaning (encapsulation) is faster but less thorough. Match the method to your carpet type and soil level.',
    },
    {
      title: 'Confirm furniture-moving policy',
      description:
        'Some providers move light furniture; others expect you to clear the room entirely. Clarify what\'s included in the quoted price — moving furniture mid-job usually triggers an add-on charge.',
    },
    {
      title: 'Ask about drying time',
      description:
        'Steam cleaning: 6–12 hours to dry. Dry cleaning: 1–2 hours. If you have pets or kids, plan accordingly. Avoid providers who claim "instant dry" — it\'s not physically possible with extraction methods.',
    },
    {
      title: 'Get a per-room or per-sq-ft quote',
      description:
        'Reputable carpet cleaners quote per room (with a max room size) or per square foot. Avoid vague "whole house" quotes — they\'re typically padded and you can\'t compare across providers.',
    },
    {
      title: 'Ask about stain + pet-odour treatment',
      description:
        'Basic cleaning doesn\'t remove set-in stains or pet urine. Ask whether the provider offers enzyme treatment for pet odour and stain-removal add-ons, and get those prices up front.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a carpet cleaning service on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green "Confirmed" badge means we\'ve independently checked that credential; "Pending" means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a carpet cleaner in ${city} before hiring them?`,
      answer:
        'Ask which cleaning method they use (hot-water extraction vs. dry), whether they move furniture, expected drying time, per-room vs. per-sq-ft pricing, and stain/pet-odour treatment options. The "Before hiring" section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there\'s no middleman fee, no commission, and no obligation to proceed with the service.',
    },
  ],
}

const PRESSURE_WASHING_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Pressure washing in ${city} restores driveways, decks, siding, and fences by removing years of algae, grime, and stains — but done wrong, it can etch concrete, splinter wood, or force water behind siding and cause rot. Pressure washing providers typically offer driveway and sidewalk cleaning, deck and fence washing, house siding (vinyl, stucco, brick), roof soft-washing, and graffiti removal. When comparing providers, ask whether they adjust pressure per surface (concrete needs ~3000 PSI; wood and siding need <1500 PSI or soft-wash), whether they use surface cleaners (rotary attachments that clean evenly without zebra-stripes), and whether they carry liability insurance for water-intrusion damage. Fieseros lists pressure washing businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Ask about pressure-per-surface',
      description:
        'Concrete handles ~3000 PSI. Wood, vinyl siding, and stucco need <1500 PSI or a soft-wash (detergent + low pressure). A provider who uses one nozzle for everything will damage your surfaces.',
    },
    {
      title: 'Confirm surface-cleaner vs. wand',
      description:
        'Surface cleaners (rotary attachments) clean driveways evenly without zebra-stripes. Wand-only cleaning leaves visible streaks. Professional pressure washers always use surface cleaners for flatwork.',
    },
    {
      title: 'Confirm liability insurance',
      description:
        'Pressure washing can force water behind siding, etch concrete, or damage landscaping. The provider should carry general liability insurance covering water-intrusion and property damage.',
    },
    {
      title: 'Ask about soft-washing for roofs',
      description:
        'Asphalt shingle roofs MUST NOT be pressure-washed (it strips granules). Roof cleaning requires soft-washing (low-pressure detergent application). Confirm the provider knows the difference before letting them near your roof.',
    },
    {
      title: 'Get a per-sq-ft quote + before/after photos',
      description:
        'Reputable pressure washers quote per square foot (not a flat "driveway special") and show before/after photos of previous work. Avoid providers who won\'t put the price per sq ft in writing.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a pressure washing service on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green "Confirmed" badge means we\'ve independently checked that credential; "Pending" means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a pressure washer in ${city} before hiring them?`,
      answer:
        'Ask about pressure-per-surface settings, whether they use surface cleaners (not just wands), liability insurance for water-intrusion damage, soft-washing for roofs (never pressure-wash shingles), and per-sq-ft pricing. The "Before hiring" section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there\'s no middleman fee, no commission, and no obligation to proceed with the service.',
    },
  ],
}

const GUTTER_CLEANING_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Gutter cleaning in ${city} is one of those small-jobs-that-matter: clogged gutters cause roof leaks, foundation damage, fascia rot, and ice dams in cold climates. Professional gutter cleaning providers typically offer hand-scoop or vacuum debris removal, downspout flushing, gutter brightening (exterior stain removal), gutter guard inspection, and minor repairs (re-sealing seams, re-securing hangers). When comparing providers, ask whether they clean by hand or with a pressure washer (pressure washing gutters can damage seals and force water behind fascia), whether they flush downspouts (many skip this), and whether they bag and haul away the debris or leave it on-site. Fieseros lists gutter cleaning businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Hand-scoop vs. pressure-wash',
      description:
        'Hand-scooping (with a gutter spoon) is the safe method. Pressure-washing gutters can damage seals, force water behind the fascia, and blast debris onto your siding. Insist on hand-scoop or vacuum.',
    },
    {
      title: 'Confirm downspout flushing is included',
      description:
        'Many cheap gutter cleaners scoop the troughs but skip the downspouts — leaving clogs that cause the same overflow you paid to fix. Confirm downspout flushing (running water through) is in the quote.',
    },
    {
      title: 'Confirm liability insurance',
      description:
        'Gutter cleaning means climbing ladders to roof height — a serious fall risk. The provider must carry general liability covering worker injury and property damage. Ask for the insurance carrier name.',
    },
    {
      title: 'Ask about debris disposal',
      description:
        'Reputable providers bag and haul away the debris. Some leave it on-site for you to deal with. Clarify disposal is included in the quoted price.',
    },
    {
      title: 'Ask about gutter guard inspection + repairs',
      description:
        'If you have gutter guards, ask whether they remove and re-install them for cleaning (guards still need periodic cleaning). Get minor repairs (loose hangers, leaky seams) quoted separately so you can decide.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a gutter cleaning service on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green "Confirmed" badge means we\'ve independently checked that credential; "Pending" means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a gutter cleaner in ${city} before hiring them?`,
      answer:
        'Ask whether they hand-scoop or pressure-wash (hand-scoop is safe, pressure-washing damages seals), whether downspout flushing is included, whether they carry liability insurance for height work, debris disposal, and gutter guard handling. The "Before hiring" section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there\'s no middleman fee, no commission, and no obligation to proceed with the service.',
    },
  ],
}

// ── Sub-industry detection ──────────────────────────────────────────────────
//
// Scans the business name + tagline for sub-industry keywords. Returns the
// first match (priority order matters: 'window' before 'cleaning' so a
// "Window Cleaning" business doesn't fall through to generic CLEANING_CONTENT).
//
// Only sub-industries of CLEANING are detected here. Other broad industries
// (hvac, plumbing, electrical, etc.) don't have the same content-mismatch
// problem because their names are specific enough that the existing
// substring matching in resolveIndustryContent() works correctly.

const SUB_INDUSTRY_KEYWORDS: Array<{ key: string; keywords: string[]; content: IndustryContent }> = [
  { key: 'window-cleaning', keywords: ['window clean', 'window wash', 'window clean', 'window washing', 'windows'], content: WINDOW_CLEANING_CONTENT },
  { key: 'carpet-cleaning', keywords: ['carpet clean', 'carpet wash', 'carpet shampoo', 'upholstery clean', 'rug clean'], content: CARPET_CLEANING_CONTENT },
  { key: 'pressure-washing', keywords: ['pressure wash', 'power wash', 'pressure cleaning', 'power cleaning'], content: PRESSURE_WASHING_CONTENT },
  { key: 'gutter-cleaning', keywords: ['gutter clean', 'gutter clear', 'gutter guard', 'downspout'], content: GUTTER_CLEANING_CONTENT },
]

/**
 * Detect a sub-industry from the business name + tagline. Returns null if no
 * sub-industry is detected (caller falls back to the broad industry content).
 *
 * Only called when the broad industry is "cleaning" (the only industry with
 * a content-mismatch problem). Other industries return null immediately.
 */
function detectSubIndustry(
  industry: string | null,
  businessName: string | null,
  tagline: string | null,
): SubIndustryMatch | null {
  if (!industry) return null
  const i = industry.toLowerCase()
  // Only run sub-industry detection for the "cleaning" broad industry.
  if (!i.includes('clean')) return null

  const haystack = `${businessName || ''} ${tagline || ''}`.toLowerCase()
  if (!haystack.trim()) return null

  for (const sub of SUB_INDUSTRY_KEYWORDS) {
    if (sub.keywords.some((kw) => haystack.includes(kw))) {
      return { key: sub.key, content: sub.content }
    }
  }
  return null
}

const GENERIC_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Hiring a local service provider in ${city} is a decision worth doing carefully — the right contractor saves you time, money, and stress, while the wrong one can leave you with shoddy work, surprise charges, and property damage. Professional service businesses handle installation, repair, maintenance, and consultation work across their trade. When comparing providers, verify they hold any required state or local licences for their industry, carry liability insurance (and workers’ comp if they have employees), and provide a written estimate before any work begins. Watch for red flags: cash-only payments, refusal to provide a written quote, pressure to decide on the spot, or contractors who want to skip permits. Fieseros lists service businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
  hiringChecklist: [
    {
      title: 'Verify state / local licence',
      description:
        'Most trades require a state or local contractor licence for jobs above a dollar threshold. Ask for the licence number and verify it on your state contractor board’s website.',
    },
    {
      title: 'Confirm liability insurance + workers’ comp',
      description:
        'Liability insurance covers property damage during the job; workers’ comp covers injuries to crew members on your property. Ask for a certificate of insurance — legitimate contractors carry both.',
    },
    {
      title: 'Get a written estimate before work starts',
      description:
        'The estimate should itemise labour, materials, and any potential change orders. Avoid contractors who refuse to put the quote in writing or insist on cash payment.',
    },
    {
      title: 'Ask about warranty on parts and labour',
      description:
        'Reputable contractors guarantee their workmanship (typically 1–2 years) and pass through manufacturer warranties on parts. Get both warranties in writing.',
    },
    {
      title: 'Insist on a written contract',
      description:
        'A written contract protects both sides. It should specify scope of work, materials, timeline, payment schedule, and cleanup. Verbal agreements are unenforceable if something goes wrong.',
    },
  ],
  platformFaqs: (city) => [
    {
      question: 'How do I know a service provider on Fieseros is verified?',
      answer:
        'Every Fieseros provider profile shows four verification badges — Identity, Business, Insurance, and Licence. A green “Confirmed” badge means we’ve independently checked that credential; “Pending” means the provider is still submitting documentation.',
    },
    {
      question: `What should I ask a service provider in ${city} before hiring them?`,
      answer:
        'Ask about their state or local licence, proof of liability insurance and workers’ comp, a written estimate itemising labour and materials, warranty on parts and labour, and insist on a written contract. The “What to expect when hiring” section above lists the full checklist.',
    },
    {
      question: 'Is it free to get a quote through Fieseros?',
      answer:
        'Yes. Requesting a quote through Fieseros is always free for the customer. The provider receives your request and responds directly — there’s no middleman fee, no commission, and no obligation to proceed with the work.',
    },
  ],
}

// ── Industry → content map ──────────────────────────────────────────────────
//
// Keys are CANONICAL industry IDs (matching INDUSTRY_TO_PLURAL_SLUG in
// plural-industry-slugs.ts). Substring matching below handles aliases
// ("air-conditioning" → hvac, "moving" → movers, etc.) so we don't need
// to enumerate every alias here.

const INDUSTRY_CONTENT_MAP: Record<string, IndustryContent> = {
  hvac: HVAC_CONTENT,
  plumbing: PLUMBING_CONTENT,
  electrical: ELECTRICAL_CONTENT,
  cleaning: CLEANING_CONTENT,
  landscaping: LANDSCAPING_CONTENT,
  roofing: ROOFING_CONTENT,
  'pest-control': PEST_CONTROL_CONTENT,
  painting: PAINTING_CONTENT,
  'auto-repair': AUTO_REPAIR_CONTENT,
  locksmith: LOCKSMITH_CONTENT,
  handyman: HANDYMAN_CONTENT,
  salon: SALON_CONTENT,
  'pet-care': PET_CARE_CONTENT,
  movers: MOVERS_CONTENT,
}

/**
 * Resolve an industry string (free-form Tenant.industry value) to a
 * matching IndustryContent object. Uses exact-match first, then
 * substring heuristics (mirrors mapIndustryToPluralSlug in plural-industry-slugs.ts).
 * Falls back to GENERIC_CONTENT for anything unknown.
 *
 * NOTE: For sub-industry detection (e.g. "Window Cleaning" inside the broad
 * "cleaning" industry), use `resolveIndustryContentWithSubIndustry()` instead.
 * This function returns the BROAD-industry content only.
 */
function resolveIndustryContent(industry: string | null | undefined): IndustryContent {
  if (!industry) return GENERIC_CONTENT
  const i = industry.toLowerCase().trim()

  // Exact match
  if (i in INDUSTRY_CONTENT_MAP) return INDUSTRY_CONTENT_MAP[i]

  // Substring matches (same heuristics as plural-industry-slugs.ts)
  if (i.includes('hvac') || i.includes('air cond') || i.includes('heating') || i.includes('cooling')) return HVAC_CONTENT
  if (i.includes('plumb')) return PLUMBING_CONTENT
  if (i.includes('electric')) return ELECTRICAL_CONTENT
  if (i.includes('clean')) return CLEANING_CONTENT
  if (i.includes('pest')) return PEST_CONTROL_CONTENT
  if (i.includes('mov')) return MOVERS_CONTENT
  if (i.includes('landscape') || i.includes('lawn') || i.includes('garden')) return LANDSCAPING_CONTENT
  if (i.includes('roof')) return ROOFING_CONTENT
  if (i.includes('paint')) return PAINTING_CONTENT
  if (i.includes('auto') || i.includes('car') || i.includes('mechanic')) return AUTO_REPAIR_CONTENT
  if (i.includes('salon') || i.includes('spa') || i.includes('beauty') || i.includes('hair')) return SALON_CONTENT
  if (i.includes('pet') || i.includes('vet') || i.includes('groom') || i.includes('dog')) return PET_CARE_CONTENT
  if (i.includes('locksmith') || i.includes('lock')) return LOCKSMITH_CONTENT
  if (i.includes('handyman') || i.includes('handy')) return HANDYMAN_CONTENT

  return GENERIC_CONTENT
}

/**
 * Resolve an industry string AND detect any sub-industry from the business
 * name + tagline. Returns the most specific IndustryContent available:
 *
 *   1. If a sub-industry is detected (e.g. "Window Cleaning" for a business
 *      named "Squeaky Dan's Window Cleaning"), return the sub-industry content.
 *   2. Otherwise, return the broad-industry content via resolveIndustryContent().
 *
 * This fixes the content-mismatch bug where a Window Cleaning business was
 * shown generic house-cleaning content (regular residential cleaning, deep
 * cleans, move-in/move-out cleans, etc.).
 */
function resolveIndustryContentWithSubIndustry(
  industry: string | null | undefined,
  businessName: string | null,
  tagline: string | null,
): { content: IndustryContent; subIndustryKey: string | null } {
  // Try sub-industry detection first (only triggers for "cleaning" broad industry).
  const sub = detectSubIndustry(industry ?? null, businessName, tagline)
  if (sub) {
    return { content: sub.content, subIndustryKey: sub.key }
  }
  return { content: resolveIndustryContent(industry), subIndustryKey: null }
}

// ── Common services map ─────────────────────────────────────────────────────
//
// A separate map (kept out of the IndustryContent interface for cleanliness)
// listing the common services typically offered in each industry. Used by
// the CommonServices section on the detail page — clearly labeled as
// "common in this category, not necessarily offered by this business".
//
// Includes sub-industry entries (window-cleaning, carpet-cleaning, etc.) so
// the Common Services section is also sub-industry-aware.

const INDUSTRY_COMMON_SERVICES: Record<string, CommonService[]> = {
  hvac: [
    { name: 'AC Repair & Installation', description: 'Central air conditioning repair, recharge, and new system installation.' },
    { name: 'Furnace Repair & Replacement', description: 'Gas, electric, and oil furnace repair, tune-ups, and full replacement.' },
    { name: 'Heat Pump Service', description: 'Heat pump installation, repair, and seasonal maintenance.' },
    { name: 'Annual Tune-Up', description: 'Preventive maintenance to keep heating and cooling systems efficient.' },
    { name: 'Indoor Air Quality', description: 'Duct cleaning, humidifier install, and air filtration systems.' },
    { name: 'Emergency HVAC Service', description: 'After-hours repair for heating and cooling failures.' },
  ],
  plumbing: [
    { name: 'Leak Repair', description: 'Drips, burst pipes, slab leaks, and hidden leak detection.' },
    { name: 'Water Heater Service', description: 'Tank and tankless water heater repair, install, and flush.' },
    { name: 'Drain Cleaning', description: 'Clogged drain snaking, hydro-jetting, and camera inspection.' },
    { name: 'Toilet Repair & Install', description: 'Running toilet fixes, replacement, and low-flow upgrades.' },
    { name: 'Faucet & Fixture Install', description: 'Kitchen, bath, and shower faucet replacement and repair.' },
    { name: 'Sewer Line Service', description: 'Sewer line camera inspection, repair, and replacement.' },
  ],
  electrical: [
    { name: 'Panel Upgrade', description: 'Service panel replacement, breaker box upgrade, and sub-panel install.' },
    { name: 'Outlet & Switch Install', description: 'New outlets, GFCI upgrades, dimmer switches, and smart switches.' },
    { name: 'Lighting Install', description: 'Recessed lighting, ceiling fans, and exterior lighting.' },
    { name: 'EV Charger Install', description: 'Level 2 home EV charging station installation.' },
    { name: 'Whole-House Rewire', description: 'Knob-and-tube or aluminum wiring replacement.' },
    { name: 'Emergency Electrical', description: 'After-hours fault diagnosis and power restoration.' },
  ],
  cleaning: [
    { name: 'Regular Residential Cleaning', description: 'Weekly, biweekly, or monthly home cleaning visits.' },
    { name: 'Deep Clean', description: 'Top-to-bottom detailed cleaning of all surfaces and rooms.' },
    { name: 'Move-In / Move-Out Clean', description: 'Empty-property cleaning for tenants and sellers.' },
    { name: 'Post-Construction Clean', description: 'Dust and debris removal after renovations or builds.' },
    { name: 'Commercial Janitorial', description: 'Office and commercial space recurring cleaning.' },
    { name: 'Carpet & Upholstery', description: 'Steam cleaning of carpets, rugs, and upholstered furniture.' },
  ],
  'window-cleaning': [
    { name: 'Exterior Window Cleaning', description: 'Outside glass cleaning including hard-to-reach and upper-floor windows.' },
    { name: 'Interior Window Cleaning', description: 'Inside glass cleaning, tracks, sills, and frames.' },
    { name: 'Screen Cleaning', description: 'Removal and washing of window screens.' },
    { name: 'Hard-Water Stain Removal', description: 'Chemical treatment for mineral deposits and sprinkler overspray.' },
    { name: 'Gutter Cleaning', description: 'Hand-scoop debris removal and downspout flushing.' },
    { name: 'Pressure Washing', description: 'Driveway, sidewalk, siding, and deck washing.' },
  ],
  'carpet-cleaning': [
    { name: 'Hot-Water Extraction', description: 'Steam cleaning — the industry-standard deep-clean method.' },
    { name: 'Dry Carpet Cleaning', description: 'Low-moisture encapsulation cleaning with 1–2 hour dry time.' },
    { name: 'Stain Removal', description: 'Targeted treatment for wine, coffee, ink, and pet stains.' },
    { name: 'Pet Odour Treatment', description: 'Enzyme treatment for urine and pet odour.' },
    { name: 'Upholstery Cleaning', description: 'Sofa, chair, and mattress steam cleaning.' },
    { name: 'Area Rug Cleaning', description: 'In-plant or on-site cleaning of oriental and area rugs.' },
  ],
  'pressure-washing': [
    { name: 'Driveway & Sidewalk Cleaning', description: 'Concrete flatwork cleaning with surface cleaners (no zebra-stripes).' },
    { name: 'Deck & Fence Washing', description: 'Low-pressure wood cleaning with appropriate PSI settings.' },
    { name: 'House Siding Wash', description: 'Vinyl, stucco, and brick exterior soft-washing.' },
    { name: 'Roof Soft-Wash', description: 'Low-pressure detergent wash — never pressure-wash shingles.' },
    { name: 'Graffiti Removal', description: 'Chemical and pressure removal of graffiti from masonry.' },
    { name: 'Patio & Paver Cleaning', description: 'Stone paver cleaning with sand re-sweeping.' },
  ],
  'gutter-cleaning': [
    { name: 'Gutter Debris Removal', description: 'Hand-scoop or vacuum cleaning of leaves and debris.' },
    { name: 'Downspout Flushing', description: 'Running water through downspouts to clear clogs.' },
    { name: 'Gutter Brightening', description: 'Exterior stain and streak removal.' },
    { name: 'Gutter Guard Inspection', description: 'Removal, clean, and re-install of gutter guards.' },
    { name: 'Minor Gutter Repairs', description: 'Re-sealing seams, re-securing hangers, fixing leaks.' },
    { name: 'Roof & Gutter Combo', description: 'Bundle roof inspection with gutter cleaning.' },
  ],
  landscaping: [
    { name: 'Lawn Maintenance', description: 'Weekly mowing, edging, and blowing.' },
    { name: 'Garden Design', description: 'Planting plans, garden beds, and hardscape integration.' },
    { name: 'Irrigation Install', description: 'Sprinkler system design, install, and repair.' },
    { name: 'Hardscaping', description: 'Patios, retaining walls, walkways, and fire pits.' },
    { name: 'Tree & Shrub Trimming', description: 'Pruning, shaping, and deadwood removal.' },
    { name: 'Seasonal Cleanup', description: 'Spring and fall leaf removal and bed prep.' },
  ],
  roofing: [
    { name: 'Roof Inspection', description: 'Visual and drone inspection for leaks, storm damage, and wear.' },
    { name: 'Leak Repair', description: 'Targeted shingle, flashing, and valley repair.' },
    { name: 'Roof Replacement', description: 'Full tear-off and re-roof with new underlayment and shingles.' },
    { name: 'Gutter Install', description: 'Seamless gutter installation and downspout extension.' },
    { name: 'Skylight Install', description: 'Velux and fixed skylight installation and reflashing.' },
    { name: 'Storm Damage Assessment', description: 'Insurance-grade inspection after hail or wind events.' },
  ],
  'pest-control': [
    { name: 'Termite Treatment', description: 'Liquid barrier and bait station termite protection.' },
    { name: 'Rodent Control', description: 'Trapping, exclusion, and ongoing rodent monitoring.' },
    { name: 'Bed Bug Treatment', description: 'Heat treatment and chemical protocols for bed bugs.' },
    { name: 'Wasp & Bee Removal', description: 'Nest removal and stinging-insect control.' },
    { name: 'Mosquito Abatement', description: 'Seasonal mosquito misting and larvicide programs.' },
    { name: 'Quarterly Preventive', description: 'Recurring perimeter pest prevention.' },
  ],
  painting: [
    { name: 'Interior Wall Painting', description: 'Walls, ceilings, and trim with prep and primer.' },
    { name: 'Exterior Painting', description: 'Siding, stucco, and trim with pressure-wash prep.' },
    { name: 'Cabinet Refinishing', description: 'Kitchen and bath cabinet repaint or refinish.' },
    { name: 'Deck Staining', description: 'Wood deck cleaning, staining, and sealing.' },
    { name: 'Drywall Repair', description: 'Patching, sanding, and texture matching before paint.' },
    { name: 'Specialty Finishes', description: 'Limewash, Venetian plaster, and faux finishes.' },
  ],
  'auto-repair': [
    { name: 'Oil Change', description: 'Conventional, synthetic blend, and full synthetic oil service.' },
    { name: 'Brake Service', description: 'Pad, rotor, and caliper replacement and inspection.' },
    { name: 'Transmission Repair', description: 'Fluid flush, rebuild, and replacement.' },
    { name: 'Engine Diagnostics', description: 'Check-engine light diagnosis and computer scanning.' },
    { name: 'Tyre Service', description: 'Rotation, balancing, alignment, and replacement.' },
    { name: 'AC Recharge', description: 'A/C system recharge and leak detection.' },
  ],
  locksmith: [
    { name: 'Lockout Service', description: 'Home, auto, and business emergency lockout response.' },
    { name: 'Lock Install & Rekey', description: 'Deadbolt install, rekeying, and master key systems.' },
    { name: 'Smart Lock Fitting', description: 'Keypad, biometric, and app-controlled lock install.' },
    { name: 'Safe Opening', description: 'Combination change and lost-key safe opening.' },
    { name: 'Auto Key Programming', description: 'Transponder and key fob cutting and programming.' },
    { name: 'Commercial Security', description: 'Master key systems and access control for businesses.' },
  ],
  handyman: [
    { name: 'Drywall Repair', description: 'Hole patching, crack repair, and texture matching.' },
    { name: 'Furniture Assembly', description: 'Flat-pack furniture, shelving, and storage assembly.' },
    { name: 'TV Mounting', description: 'Wall mounting with in-wall cable concealment.' },
    { name: 'Fixture Install', description: 'Light fixtures, ceiling fans, and towel bars.' },
    { name: 'Door & Window Repair', description: 'Sticking doors, broken hardware, and weatherstripping.' },
    { name: 'General Repairs', description: 'Small jobs that don\'t need a specialist contractor.' },
  ],
  salon: [
    { name: 'Haircut & Styling', description: 'Men\'s, women\'s, and children\'s cuts and styling.' },
    { name: 'Colour Services', description: 'Single process, highlights, balayage, and colour correction.' },
    { name: 'Facials & Skin Care', description: 'Customised facials, peels, and skin treatments.' },
    { name: 'Manicure & Pedicure', description: 'Gel, regular, and spa manicures and pedicures.' },
    { name: 'Waxing & Threading', description: 'Brow, lip, and full-body waxing and threading.' },
    { name: 'Makeup Application', description: 'Event, bridal, and lesson makeup services.' },
  ],
  'pet-care': [
    { name: 'Dog Walking', description: 'Solo and group walks, 30/60/90 minute options.' },
    { name: 'Pet Sitting', description: 'In-home overnight or drop-in pet sitting.' },
    { name: 'Boarding', description: 'Facility-based pet boarding with play areas.' },
    { name: 'Grooming', description: 'Bath, haircut, nail trim, and breed-specific styling.' },
    { name: 'Dog Training', description: 'Obedience, behaviour modification, and puppy training.' },
    { name: 'Veterinary Support', description: 'Transport, medication, and post-surgery care.' },
  ],
  movers: [
    { name: 'Local Moving', description: 'Same-city residential moves with full-service loading.' },
    { name: 'Long-Distance Moving', description: 'Interstate and cross-country moving with tracking.' },
    { name: 'Packing Services', description: 'Full or partial packing with materials included.' },
    { name: 'Furniture Disassembly', description: 'Bed, desk, and table breakdown and reassembly.' },
    { name: 'Specialty Item Transport', description: 'Pianos, antiques, safes, and artwork.' },
    { name: 'Storage', description: 'Short-term and long-term storage between moves.' },
  ],
}

// Fallback for industries not in the map (e.g. unmapped or new industries).
const GENERIC_COMMON_SERVICES: CommonService[] = [
  { name: 'Standard Service', description: 'The core service this category of business typically offers.' },
  { name: 'Repair & Maintenance', description: 'Ongoing maintenance and repair work.' },
  { name: 'Installation', description: 'New installation and setup services.' },
  { name: 'Consultation', description: 'On-site assessment and project scoping.' },
  { name: 'Emergency Service', description: 'After-hours or urgent response.' },
  { name: 'Free Quote', description: 'On-site or virtual cost estimate.' },
]

// ── Templated-description detector ──────────────────────────────────────────
//
// Detects the auto-generated boilerplate description that was created from
// a template (e.g. "Looking for reliable {X} services in {Y}? {Name} is a
// trusted {X} business based in {Y}, {State}. Contact {Name} today for
// quality workmanship, transparent pricing, and professional service.").
//
// When a templated description is detected, the detail page replaces it
// with an honest business-specific paragraph + Claim CTA instead of showing
// the boilerplate. Google's Helpful Content Update penalises templated text.

const TEMPLATE_SIGNALS: RegExp[] = [
  /^looking for reliable /i,
  /is a trusted .* business/i,
  /contact .+ today for/i,
  /quality workmanship, transparent pricing/i,
  /professional service\.?$/i,
]

/**
 * Returns true if the given description is empty, too short (<400 chars), or
 * matches the templated-boilerplate pattern. When true, the detail page
 * should replace the description with an honest business-specific paragraph
 * (see the AboutBusiness section in evergreen-sections.tsx) rather than
 * showing the boilerplate.
 */
export function isTemplatedDescription(description: string | null | undefined): boolean {
  if (!description || !description.trim()) return true
  const trimmed = description.trim()
  // Short descriptions are treated as templated (insufficient unique content).
  if (trimmed.length < 400) return true
  // Match any 2 of the 5 template signals → templated.
  const matches = TEMPLATE_SIGNALS.filter((re) => re.test(trimmed)).length
  return matches >= 2
}

// ── Render-time seoDescription normalization ─────────────────────────────────
//
// WHY THIS EXISTS (and why it's render-time, not a DB migration):
//   The Google Places seed importer (src/lib/google-places-to-tenant.ts:297)
//   previously generated seoDescription values containing the phrase
//   "Book trusted local professionals for quality workmanship and transparent
//   pricing." For an unclaimed/unverified business, the word "trusted" can
//   imply Fieseros has independently verified that business — which is not
//   the case until the owner claims + completes verification.
//
//   The generator has been updated to emit "Book local professionals" for
//   NEW imports (see google-places-to-tenant.ts). But thousands of EXISTING
//   businesses in the DB still have the old "trusted" wording in their
//   seoDescription field.
//
//   Rather than running a bulk UPDATE across all those rows (which would
//   simultaneously change the rendered meta description of thousands of
//   already-indexed URLs — an unnecessary ranking variable), we normalize
//   at render time. This:
//     - Leaves the database untouched (zero migration risk)
//     - Only affects the <meta name="description"> tag output
//     - Is a pure string transform — no semantic change to the page
//     - Can be removed later once a DB migration is deemed worthwhile
//
//   The normalization is deliberately NARROW: it only matches the exact
//   boilerplate phrase "Book trusted local professionals" and replaces it
//   with "Book local professionals". It does NOT blanket-replace every
//   occurrence of "trusted" — if a business owner wrote "trusted" in their
//   own authored description, that's their choice and we respect it.
//   (Owner-authored descriptions are not run through this function —
//   see the call site in [companySlug]/[city]/[slug]/page.tsx, which only
//   normalizes business.seoDescription, not tagline/description.)
//
// SAFETY: This is a strict substring replacement. It cannot change the
// meaning of the description — only remove one adjective from one
// boilerplate phrase. Google's understanding of the page (HVAC + city +
// business name) is unaffected.

const TRUSTED_PROFESSIONALS_RE = /Book trusted local professionals/g

/**
 * Normalize an auto-generated seoDescription by removing the "trusted"
 * adjective from the boilerplate "Book trusted local professionals" phrase.
 *
 * Safe to call on any string — returns the input unchanged if the phrase
 * is not present. Returns null/empty unchanged.
 *
 * Only apply this to the `seoDescription` field (which may contain the
 * auto-generated boilerplate). Do NOT apply to owner-authored `tagline`
 * or `description` fields — those are the business owner's own words.
 */
export function normalizeSeoDescription(description: string | null | undefined): string | null | undefined {
  if (!description) return description
  return description.replace(TRUSTED_PROFESSIONALS_RE, 'Book local professionals')
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns an ~120-150 word evergreen paragraph about hiring this industry
 * in `city`. Sub-industry aware: a "Window Cleaning" business gets
 * window-cleaning-specific content, not generic house-cleaning content.
 *
 * `city` falls back to "your area" if null (so the paragraph still reads
 * naturally even when a business has no city set — though in practice
 * the detail page only renders for businesses WITH a city).
 */
export function getIndustryAboutParagraph(
  industry: string | null,
  city: string | null,
  country: string,
  businessName?: string | null,
  tagline?: string | null,
): string {
  const cityName = city?.trim() || 'your area'
  const { content } = resolveIndustryContentWithSubIndustry(industry, businessName ?? null, tagline ?? null)
  return content.aboutParagraph(cityName, country)
}

/**
 * Returns 4-6 hiring checklist items specific to this industry.
 * Sub-industry aware (window cleaning, carpet cleaning, etc.).
 * Used by the "Before hiring a {Industry}" section.
 */
export function getIndustryHiringChecklist(
  industry: string | null,
  businessName?: string | null,
  tagline?: string | null,
): HiringChecklistItem[] {
  const { content } = resolveIndustryContentWithSubIndustry(industry, businessName ?? null, tagline ?? null)
  return content.hiringChecklist
}

/**
 * Returns 3 platform-level FAQs for this industry in `city`.
 * Sub-industry aware (window cleaning, carpet cleaning, etc.).
 *
 * The returned FAQs are also merged into the FAQ JSON-LD schema so
 * every detail page is eligible for FAQ rich results in Google Search,
 * even when the business has no FAQs of their own.
 */
export function getIndustryPlatformFaqs(
  industry: string | null,
  city: string | null,
  businessName?: string | null,
  tagline?: string | null,
): PlatformFaq[] {
  const cityName = city?.trim() || 'your area'
  const { content } = resolveIndustryContentWithSubIndustry(industry, businessName ?? null, tagline ?? null)
  return content.platformFaqs(cityName)
}

/**
 * Returns the resolved industry display name for use in section headings.
 * Sub-industry aware: returns "Window Cleaning" for a window-cleaning
 * business (instead of the broad "Cleaning").
 *
 * Falls back to the broad-industry display name when no sub-industry is
 * detected, then to a slugified industry name.
 */
export function getResolvedIndustryDisplayName(
  industry: string | null,
  businessName?: string | null,
  tagline?: string | null,
): string {
  const { content: _content, subIndustryKey } = resolveIndustryContentWithSubIndustry(
    industry,
    businessName ?? null,
    tagline ?? null,
  )
  // Map sub-industry keys to display names. Keep these in sync with the
  // SUB_INDUSTRY_KEYWORDS entries above.
  const SUB_INDUSTRY_DISPLAY_NAMES: Record<string, string> = {
    'window-cleaning': 'Window Cleaning',
    'carpet-cleaning': 'Carpet Cleaning',
    'pressure-washing': 'Pressure Washing',
    'gutter-cleaning': 'Gutter Cleaning',
  }
  if (subIndustryKey && subIndustryKey in SUB_INDUSTRY_DISPLAY_NAMES) {
    return SUB_INDUSTRY_DISPLAY_NAMES[subIndustryKey]
  }
  // Fall back to the broad-industry display name via the existing helper
  // (imported at the top of this file).
  return getBroadIndustryDisplayName(industry)
}

/**
 * Returns 4-6 "common services" typically offered in this industry.
 * Sub-industry aware (window cleaning, carpet cleaning, etc.).
 *
 * Used by the CommonServices section on the detail page — cards are
 * clearly labeled "Common services in this category — not necessarily
 * offered by this business" so we never claim the specific business
 * offers these services.
 */
export function getIndustryCommonServices(
  industry: string | null,
  businessName?: string | null,
  tagline?: string | null,
): CommonService[] {
  const { subIndustryKey } = resolveIndustryContentWithSubIndustry(industry, businessName ?? null, tagline ?? null)
  // Try sub-industry first, then broad industry, then generic fallback.
  if (subIndustryKey && subIndustryKey in INDUSTRY_COMMON_SERVICES) {
    return INDUSTRY_COMMON_SERVICES[subIndustryKey]
  }
  if (industry) {
    const i = industry.toLowerCase().trim()
    // Try exact match + substring matches (mirrors resolveIndustryContent).
    if (i in INDUSTRY_COMMON_SERVICES) return INDUSTRY_COMMON_SERVICES[i]
    for (const key of Object.keys(INDUSTRY_COMMON_SERVICES)) {
      if (i.includes(key) || key.includes(i)) return INDUSTRY_COMMON_SERVICES[key]
    }
  }
  return GENERIC_COMMON_SERVICES
}
