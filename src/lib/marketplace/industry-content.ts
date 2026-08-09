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

export interface HiringChecklistItem {
  title: string
  description: string
}

export interface PlatformFaq {
  question: string
  answer: string
}

interface IndustryContent {
  /** Returns an ~120-150 word paragraph about hiring this industry in `city`. */
  aboutParagraph: (city: string, country: string) => string
  /** 4-6 hiring checklist items specific to this industry. */
  hiringChecklist: HiringChecklistItem[]
  /** Returns 3 platform-level FAQs for this industry in `city`. */
  platformFaqs: (city: string) => PlatformFaq[]
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

const GENERIC_CONTENT: IndustryContent = {
  aboutParagraph: (city, _country) =>
    `Hiring a trusted local service provider in ${city} is a decision worth doing carefully — the right contractor saves you time, money, and stress, while the wrong one can leave you with shoddy work, surprise charges, and property damage. Professional service businesses handle installation, repair, maintenance, and consultation work across their trade. When comparing providers, verify they hold any required state or local licences for their industry, carry liability insurance (and workers’ comp if they have employees), and provide a written estimate before any work begins. Watch for red flags: cash-only payments, refusal to provide a written quote, pressure to decide on the spot, or contractors who want to skip permits. Fieseros lists service businesses serving ${city}, with verification status visible on each profile so you can quickly filter for providers whose identity, business, insurance, and licensing have been independently checked.`,
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

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns an ~120-150 word evergreen paragraph about hiring this
 * industry in `city`. Used by the "About {Industry} services in {City}"
 * section on the marketplace detail page.
 *
 * `city` falls back to "your area" if null (so the paragraph still reads
 * naturally even when a business has no city set — though in practice
 * the detail page only renders for businesses WITH a city).
 */
export function getIndustryAboutParagraph(
  industry: string | null,
  city: string | null,
  country: string,
): string {
  const cityName = city?.trim() || 'your area'
  return resolveIndustryContent(industry).aboutParagraph(cityName, country)
}

/**
 * Returns 4-6 hiring checklist items specific to this industry.
 * Used by the "What to expect when hiring a {Industry}" section.
 */
export function getIndustryHiringChecklist(
  industry: string | null,
): HiringChecklistItem[] {
  return resolveIndustryContent(industry).hiringChecklist
}

/**
 * Returns 3 platform-level FAQs for this industry in `city`.
 * Used by the "Frequently asked questions about {industry} in {city}"
 * section — these render IN ADDITION TO any business-authored FAQs the
 * provider has entered (business FAQs render first, platform FAQs below).
 *
 * The returned FAQs are also merged into the FAQ JSON-LD schema so
 * every detail page is eligible for FAQ rich results in Google Search,
 * even when the business has no FAQs of their own.
 */
export function getIndustryPlatformFaqs(
  industry: string | null,
  city: string | null,
): PlatformFaq[] {
  const cityName = city?.trim() || 'your area'
  return resolveIndustryContent(industry).platformFaqs(cityName)
}
