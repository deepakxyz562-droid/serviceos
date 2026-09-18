/**
 * Shared benchmark data and calculation formulas for the Free Tools Suite.
 */

// ─── 1. Job Cost Benchmarks ───────────────────────────────────────────────────

export interface ServiceCostBenchmark {
  id: string;
  name: string;
  category: 'emergency' | 'interior' | 'exterior' | 'remodel';
  baseCost: number;
  unit: string;
  lowMultiplier: number;
  highMultiplier: number;
  typicalDuration: string;
  description: string;
}

export const SERVICE_COST_DATA: Record<string, ServiceCostBenchmark> = {
  'Plumbing': {
    id: 'plumbing',
    name: 'Plumbing Repair & Install',
    category: 'emergency',
    baseCost: 350,
    unit: 'per repair job',
    lowMultiplier: 0.75,
    highMultiplier: 1.35,
    typicalDuration: '2–4 hours',
    description: 'Pipe leaks, faucet replacement, toilet repairs, garbage disposals, and drain clearing.',
  },
  'Electrical': {
    id: 'electrical',
    name: 'Electrical Repair & Wiring',
    category: 'emergency',
    baseCost: 400,
    unit: 'per service call',
    lowMultiplier: 0.8,
    highMultiplier: 1.4,
    typicalDuration: '2–5 hours',
    description: 'Outlets, breakers, light fixtures, ceiling fans, EV charger installs, and panel diagnostics.',
  },
  'HVAC': {
    id: 'hvac',
    name: 'HVAC Tune-up & Repair',
    category: 'emergency',
    baseCost: 800,
    unit: 'per service / repair',
    lowMultiplier: 0.7,
    highMultiplier: 1.5,
    typicalDuration: '3–6 hours',
    description: 'A/C diagnostics, furnace tune-ups, thermostat wiring, capacitor replacements, and refrigerant refills.',
  },
  'House Cleaning': {
    id: 'house_cleaning',
    name: 'Deep House Cleaning',
    category: 'interior',
    baseCost: 180,
    unit: 'per cleaning session',
    lowMultiplier: 0.75,
    highMultiplier: 1.3,
    typicalDuration: '3–5 hours',
    description: 'Whole-house deep clean, kitchen & bathrooms, dusting, mopping, and vacuuming.',
  },
  'Landscaping': {
    id: 'landscaping',
    name: 'Landscaping & Yard Care',
    category: 'exterior',
    baseCost: 300,
    unit: 'per project / cleanup',
    lowMultiplier: 0.7,
    highMultiplier: 1.4,
    typicalDuration: '3–6 hours',
    description: 'Mulching, hedge trimming, seasonal bed cleanup, planting, and sod repair.',
  },
  'Painting (Interior)': {
    id: 'painting_interior',
    name: 'Interior Painting',
    category: 'interior',
    baseCost: 1200,
    unit: 'per room average',
    lowMultiplier: 0.8,
    highMultiplier: 1.35,
    typicalDuration: '1–2 days',
    description: 'Wall prep, priming, 2 coats premium paint, baseboard and trim detailing.',
  },
  'Painting (Exterior)': {
    id: 'painting_exterior',
    name: 'Exterior House Painting',
    category: 'exterior',
    baseCost: 3200,
    unit: 'per home project',
    lowMultiplier: 0.8,
    highMultiplier: 1.4,
    typicalDuration: '3–5 days',
    description: 'Power wash, scrape, caulk, prime, and 2-coat weather-resistant exterior paint.',
  },
  'Roofing': {
    id: 'roofing',
    name: 'Roofing Repair & Patching',
    category: 'exterior',
    baseCost: 1500,
    unit: 'per repair / section',
    lowMultiplier: 0.75,
    highMultiplier: 1.5,
    typicalDuration: '1–2 days',
    description: 'Shingle replacement, leak repair, flashing fix, ridge cap sealing, and pipe boot boots.',
  },
  'Handyman': {
    id: 'handyman',
    name: 'General Handyman Services',
    category: 'interior',
    baseCost: 250,
    unit: 'per half-day job',
    lowMultiplier: 0.75,
    highMultiplier: 1.3,
    typicalDuration: '2–4 hours',
    description: 'Door repairs, drywall patching, shelf hanging, caulking, and small fixture replacements.',
  },
  'Moving': {
    id: 'moving',
    name: 'Local Moving Services',
    category: 'interior',
    baseCost: 1100,
    unit: 'per local move',
    lowMultiplier: 0.8,
    highMultiplier: 1.4,
    typicalDuration: '4–8 hours',
    description: '2 movers + truck, furniture pads, dollies, loading, transport, and unloading.',
  },
  'Snow Removal': {
    id: 'snow_removal',
    name: 'Snow Plowing & De-icing',
    category: 'exterior',
    baseCost: 150,
    unit: 'per visit / storm',
    lowMultiplier: 0.8,
    highMultiplier: 1.3,
    typicalDuration: '1–2 hours',
    description: 'Driveway clearing, walkway snow blowing, and eco-friendly rock salt de-icing.',
  },
  'Pest Control': {
    id: 'pest_control',
    name: 'Pest Control Extermination',
    category: 'interior',
    baseCost: 220,
    unit: 'per treatment',
    lowMultiplier: 0.85,
    highMultiplier: 1.3,
    typicalDuration: '1–2 hours',
    description: 'Inspection, perimeter barrier spray, baiting, and targeted insect/rodent treatments.',
  },
  'Pressure Washing': {
    id: 'pressure_washing',
    name: 'Driveway & Siding Pressure Wash',
    category: 'exterior',
    baseCost: 320,
    unit: 'per project',
    lowMultiplier: 0.8,
    highMultiplier: 1.35,
    typicalDuration: '2–4 hours',
    description: 'Driveway, patio, deck, or siding wash with surface cleaner and biodegradable surfactant.',
  },
  'Window Cleaning': {
    id: 'window_cleaning',
    name: 'Window Washing (In & Out)',
    category: 'exterior',
    baseCost: 250,
    unit: 'per session (avg 15-20 windows)',
    lowMultiplier: 0.8,
    highMultiplier: 1.3,
    typicalDuration: '2–4 hours',
    description: 'Interior and exterior glass, screens brushed, and sills wiped down streak-free.',
  },
  'Carpentry': {
    id: 'carpentry',
    name: 'Custom Trim & Carpentry',
    category: 'interior',
    baseCost: 650,
    unit: 'per project',
    lowMultiplier: 0.75,
    highMultiplier: 1.4,
    typicalDuration: '1–2 days',
    description: 'Crown moulding, wainscoting, custom shelving, interior door hanging, and framing.',
  },
  'Tree Service': {
    id: 'tree_service',
    name: 'Tree Trimming & Pruning',
    category: 'exterior',
    baseCost: 750,
    unit: 'per tree / crew visit',
    lowMultiplier: 0.7,
    highMultiplier: 1.5,
    typicalDuration: '3–6 hours',
    description: 'Deadwood removal, canopy thinning, hazard branch pruning, and debris chipping.',
  },
  'Flooring': {
    id: 'flooring',
    name: 'Hardwood & Vinyl Plank Flooring',
    category: 'interior',
    baseCost: 2800,
    unit: 'per room avg (250 sq ft)',
    lowMultiplier: 0.8,
    highMultiplier: 1.45,
    typicalDuration: '1–3 days',
    description: 'Subfloor prep, underlayment, floor installation, transition strips, and baseboards.',
  },
  'Drywall': {
    id: 'drywall',
    name: 'Drywall Repair & Installation',
    category: 'interior',
    baseCost: 650,
    unit: 'per repair / room',
    lowMultiplier: 0.75,
    highMultiplier: 1.35,
    typicalDuration: '1–2 days',
    description: 'Hanging sheets, taping, 3 coats mud, sanding to Level 4/5 smooth paint-ready finish.',
  },
  'Bathroom Remodel': {
    id: 'bathroom_remodel',
    name: 'Full Bathroom Remodel',
    category: 'remodel',
    baseCost: 12500,
    unit: 'full bathroom renovation',
    lowMultiplier: 0.8,
    highMultiplier: 1.5,
    typicalDuration: '2–3 weeks',
    description: 'Tile shower/tub, vanity, toilet, fixtures, plumbing rough-in, waterproof backer, and lighting.',
  },
  'Kitchen Remodel': {
    id: 'kitchen_remodel',
    name: 'Full Kitchen Remodel',
    category: 'remodel',
    baseCost: 26000,
    unit: 'full kitchen renovation',
    lowMultiplier: 0.8,
    highMultiplier: 1.5,
    typicalDuration: '3–5 weeks',
    description: 'Cabinets, quartz/granite countertops, tile backsplash, sink, plumbing, electrical, and flooring.',
  },
};

export function getRegionalMultiplier(zip: string): { mult: number; label: string } {
  if (!zip || zip.length < 3) return { mult: 1.0, label: 'National Average' };
  const prefix = parseInt(zip.substring(0, 3), 10);
  if (isNaN(prefix)) return { mult: 1.0, label: 'National Average' };

  // High cost of living metro areas
  // NY/NJ/CT (100-119), CA Bay Area & LA (900-951), Seattle (980-986), DC/MD/VA (200-205, 208-223), Boston (021-024)
  if (
    (prefix >= 100 && prefix <= 119) ||
    (prefix >= 900 && prefix <= 951) ||
    (prefix >= 980 && prefix <= 986) ||
    (prefix >= 200 && prefix <= 205) ||
    (prefix >= 208 && prefix <= 223) ||
    (prefix >= 21 && prefix <= 24)
  ) {
    return { mult: 1.25, label: 'Metro / High-Cost Area (+25%)' };
  }

  // Moderate cost areas
  // Chicago (600-629), Atlanta (300-319), Texas metros (750-799), Florida (330-349), Philly (190-196), Denver (800-816)
  if (
    (prefix >= 600 && prefix <= 629) ||
    (prefix >= 300 && prefix <= 319) ||
    (prefix >= 750 && prefix <= 799) ||
    (prefix >= 330 && prefix <= 349) ||
    (prefix >= 190 && prefix <= 196) ||
    (prefix >= 800 && prefix <= 816)
  ) {
    return { mult: 1.05, label: 'Moderate Metro Area (+5%)' };
  }

  // Lower cost of living / rural areas
  return { mult: 0.88, label: 'Regional / Lower-Cost Area (-12%)' };
}

export function formatDollar(amount: number): string {
  const rounded = Math.round(amount / 5) * 5;
  return '$' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ─── 2. Renovation ROI Benchmarks ─────────────────────────────────────────────

export interface RenovationProject {
  id: string;
  name: string;
  category: 'Kitchen & Bath' | 'Energy & HVAC' | 'Exterior & Curb' | 'Interior & Living';
  avgCost: number;
  roiPercentage: number; // e.g. 85 = 85%
  typicalPaybackYears: string;
  description: string;
  resaleImpact: 'High' | 'Very High' | 'Moderate';
}

export const RENOVATION_PROJECTS: RenovationProject[] = [
  {
    id: 'garage_door',
    name: 'Garage Door Replacement',
    category: 'Exterior & Curb',
    avgCost: 4500,
    roiPercentage: 102.7,
    typicalPaybackYears: 'Immediate at sale',
    description: 'High-tensile insulated steel door with heavy-duty tracks. Consistently ranks #1 in Remodeling Magazine Cost vs. Value report.',
    resaleImpact: 'Very High',
  },
  {
    id: 'minor_kitchen',
    name: 'Minor Kitchen Remodel',
    category: 'Kitchen & Bath',
    avgCost: 26500,
    roiPercentage: 85.7,
    typicalPaybackYears: '1–2 years',
    description: 'Cabinet refacing, new hardware, energy-efficient cooktop/oven, mid-range quartz countertops, and modern sink/faucet.',
    resaleImpact: 'Very High',
  },
  {
    id: 'entry_door',
    name: 'Steel Front Entry Door',
    category: 'Exterior & Curb',
    avgCost: 2200,
    roiPercentage: 100.9,
    typicalPaybackYears: 'Immediate at sale',
    description: 'Pre-hung 20-gauge steel door with dual-pane decorative glass and heavy-duty lockset. Boosts immediate curb appeal.',
    resaleImpact: 'High',
  },
  {
    id: 'wood_deck',
    name: 'Wood Deck Addition (16x20 ft)',
    category: 'Exterior & Curb',
    avgCost: 17200,
    roiPercentage: 68.2,
    typicalPaybackYears: '2–3 years',
    description: 'Pressure-treated pine decking with built-in bench, railings, and single set of stairs.',
    resaleImpact: 'Moderate',
  },
  {
    id: 'bathroom_remodel',
    name: 'Midrange Bathroom Remodel',
    category: 'Kitchen & Bath',
    avgCost: 24500,
    roiPercentage: 66.7,
    typicalPaybackYears: '2–4 years',
    description: 'Porcelain tub with ceramic tile surround, recessed medicine cabinet, stone vanity top, and updated exhaust fan.',
    resaleImpact: 'High',
  },
  {
    id: 'heat_pump_hvac',
    name: 'High-Efficiency Heat Pump HVAC',
    category: 'Energy & HVAC',
    avgCost: 11800,
    roiPercentage: 74.0,
    typicalPaybackYears: '3–5 years (plus utility savings)',
    description: 'Inverter-driven multi-stage heat pump (SEER2 18+). Qualifies for federal tax credits and slashes annual heating/cooling bills.',
    resaleImpact: 'High',
  },
  {
    id: 'hardwood_refinish',
    name: 'Hardwood Flooring Refinish / Install',
    category: 'Interior & Living',
    avgCost: 5400,
    roiPercentage: 118.0,
    typicalPaybackYears: 'Immediate at sale',
    description: 'Sand existing solid oak floors to bare wood, stain, and apply 3 coats polyurethane. Top interior project requested by buyers.',
    resaleImpact: 'Very High',
  },
  {
    id: 'vinyl_windows',
    name: 'Vinyl Window Replacement (10 Units)',
    category: 'Energy & HVAC',
    avgCost: 20000,
    roiPercentage: 69.5,
    typicalPaybackYears: '3–5 years',
    description: 'Low-E, argon gas-filled double-hung windows with custom exterior trim cladding. Reduces drafts and exterior street noise.',
    resaleImpact: 'Moderate',
  },
  {
    id: 'major_kitchen',
    name: 'Major Luxury Kitchen Remodel',
    category: 'Kitchen & Bath',
    avgCost: 78000,
    roiPercentage: 54.0,
    typicalPaybackYears: '4–7 years',
    description: 'Custom hardwood cabinetry, commercial-grade ranges/ovens, built-in panel-ready refrigeration, and large marble island.',
    resaleImpact: 'Moderate',
  },
  {
    id: 'exterior_siding',
    name: 'Fiber-Cement Siding Replacement',
    category: 'Exterior & Curb',
    avgCost: 19500,
    roiPercentage: 88.5,
    typicalPaybackYears: '2–4 years',
    description: 'Non-combustible James Hardie lap siding with factory ColorPlus finish. Rot-proof, pest-proof, and weather resistant.',
    resaleImpact: 'Very High',
  },
];

// ─── 3. Home Maintenance Seasonal Tasks ───────────────────────────────────────

export interface MaintenanceTask {
  id: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  title: string;
  category: 'HVAC' | 'Plumbing' | 'Roof & Gutters' | 'Exterior' | 'Safety';
  difficulty: 'Easy DIY' | 'Moderate DIY' | 'Pro Recommended';
  timeEstimate: string;
  costEstimate: string;
  description: string;
  whyItMatters: string;
}

export const SEASONAL_MAINTENANCE_TASKS: MaintenanceTask[] = [
  // Spring
  {
    id: 'sp_1',
    season: 'spring',
    title: 'Clean Gutters & Downspouts',
    category: 'Roof & Gutters',
    difficulty: 'Moderate DIY',
    timeEstimate: '2 hours',
    costEstimate: '$0 – $50 (DIY) / $150 (Pro)',
    description: 'Clear winter leaves and debris from all gutters. Flush downspouts with garden hose to verify free drainage away from foundation.',
    whyItMatters: 'Clogged gutters cause roof valley rot, fascia damage, and basement foundation leaks.',
  },
  {
    id: 'sp_2',
    season: 'spring',
    title: 'A/C Condenser Unit Inspection & Filter Change',
    category: 'HVAC',
    difficulty: 'Easy DIY',
    timeEstimate: '1 hour',
    costEstimate: '$25 (Filters) / $120 (Pro Tune-up)',
    description: 'Clear leaves within 2 feet of outdoor compressor. Gently hose down aluminum fins. Replace indoor air return filter.',
    whyItMatters: 'Improves cooling efficiency by up to 20% and prevents costly compressor burnouts in summer heat.',
  },
  {
    id: 'sp_3',
    season: 'spring',
    title: 'Test Sump Pump & Clean Pit',
    category: 'Plumbing',
    difficulty: 'Easy DIY',
    timeEstimate: '30 mins',
    costEstimate: '$0',
    description: 'Pour 5 gallons of water into sump pit until float switch triggers. Verify pump ejects water cleanly away from home.',
    whyItMatters: 'Spring rains and snowmelt can flood basements in minutes if the primary pump float is stuck.',
  },
  {
    id: 'sp_4',
    season: 'spring',
    title: 'Inspect Roof Shingles & Flashing',
    category: 'Roof & Gutters',
    difficulty: 'Pro Recommended',
    timeEstimate: '1 hour',
    costEstimate: '$0 (Binoculars) / $180 (Pro)',
    description: 'Check for curled, cracked, or missing shingles from winter storms. Inspect chimney and vent pipe flashing.',
    whyItMatters: 'Catching a loose shingle costs $150 to repair versus $5,000+ for ceiling water damage repair.',
  },

  // Summer
  {
    id: 'su_1',
    season: 'summer',
    title: 'Flush Water Heater Tank',
    category: 'Plumbing',
    difficulty: 'Moderate DIY',
    timeEstimate: '1 hour',
    costEstimate: '$0 – $15',
    description: 'Connect hose to tank drain valve and flush sediment from bottom until water runs clear. Test temperature & pressure relief valve.',
    whyItMatters: 'Sediment buildup insulates water from burners, reducing hot water output and cutting tank lifespan in half.',
  },
  {
    id: 'su_2',
    season: 'summer',
    title: 'Inspect Deck Boards, Railings & Sealant',
    category: 'Exterior',
    difficulty: 'Moderate DIY',
    timeEstimate: '2–3 hours',
    costEstimate: '$40 (Sealant)',
    description: 'Perform water drop test: sprinkle water on deck boards. If it absorbs rather than beads, clean and re-apply UV sealant.',
    whyItMatters: 'Prevents splintering, cupping, and dry rot from intense summer sun and humidity.',
  },
  {
    id: 'su_3',
    season: 'summer',
    title: 'Clean Refrigerator Coils & Dryer Vent',
    category: 'Safety',
    difficulty: 'Easy DIY',
    timeEstimate: '45 mins',
    costEstimate: '$12 (Coil brush)',
    description: 'Unplug fridge and brush dust off bottom/rear coils. Disconnect dryer vent duct and vacuum out accumulated lint.',
    whyItMatters: 'Dryer lint is the #1 cause of residential appliance fires; clean coils keep fridge compressors cool.',
  },

  // Fall
  {
    id: 'fa_1',
    season: 'fall',
    title: 'Furnace / Heating System Professional Tune-Up',
    category: 'HVAC',
    difficulty: 'Pro Recommended',
    timeEstimate: '1.5 hours',
    costEstimate: '$90 – $150 (Pro)',
    description: 'Check heat exchanger for carbon monoxide cracks, clean burners, calibrate thermostat, and test safety shutoffs.',
    whyItMatters: 'Ensures safe, odor-free heating and prevents midnight heating failures during the first freeze.',
  },
  {
    id: 'fa_2',
    season: 'fall',
    title: 'Shut Off & Drain Outdoor Hose Bibs',
    category: 'Plumbing',
    difficulty: 'Easy DIY',
    timeEstimate: '30 mins',
    costEstimate: '$0 / $10 (Insulated bib covers)',
    description: 'Close interior shutoff valves for exterior spigots. Open outdoor faucets to drain all trapped water. Install foam covers.',
    whyItMatters: 'Frozen spigot pipes burst inside wall cavities, causing catastrophic winter flooding.',
  },
  {
    id: 'fa_3',
    season: 'fall',
    title: 'Seal Window & Door Weatherstripping',
    category: 'Exterior',
    difficulty: 'Easy DIY',
    timeEstimate: '1–2 hours',
    costEstimate: '$25 (Caulk & weatherstrip)',
    description: 'Check doors with dollar bill test (if it pulls out easily, seal is loose). Caulk around exterior window trim gaps.',
    whyItMatters: 'Drafty gaps can add 15% to your winter heating bill.',
  },

  // Winter
  {
    id: 'wi_1',
    season: 'winter',
    title: 'Test Smoke & Carbon Monoxide Detectors',
    category: 'Safety',
    difficulty: 'Easy DIY',
    timeEstimate: '15 mins',
    costEstimate: '$10 (9V batteries)',
    description: 'Press test buttons on all alarms. Replace batteries older than 1 year. Check expiration date on alarm back (replace units > 10 yrs old).',
    whyItMatters: 'Heating equipment usage peaks in winter, creating highest annual risk of fires and carbon monoxide poisoning.',
  },
  {
    id: 'wi_2',
    season: 'winter',
    title: 'Inspect Attic Insulation & Ice Dam Prevention',
    category: 'Roof & Gutters',
    difficulty: 'Easy DIY',
    timeEstimate: '45 mins',
    costEstimate: '$0',
    description: 'Verify attic insulation is level and does not block soffit vents. Look for signs of warm air leaking into attic space.',
    whyItMatters: 'Warm attics melt roof snow, which refreezes at cold eaves to form damaging ice dams that back up under shingles.',
  },
  {
    id: 'wi_3',
    season: 'winter',
    title: 'Check Plumbing Under Sinks on Exterior Walls',
    category: 'Plumbing',
    difficulty: 'Easy DIY',
    timeEstimate: '15 mins',
    costEstimate: '$0',
    description: 'During sub-zero cold snaps, open cabinet doors under sinks to allow room heat to circulate around pipes.',
    whyItMatters: 'Exterior-wall plumbing can freeze even while the house feels warm.',
  },
];

// ─── 4. Trade Material Formulas ───────────────────────────────────────────────

export interface MaterialCalculation {
  trade: string;
  name: string;
  unitMeasurement: string;
  coveragePerUnit: number;
  unitName: string;
  defaultWastePercent: number;
  lowCostPerUnit: number;
  midCostPerUnit: number;
  highCostPerUnit: number;
  notes: string;
}

export const TRADE_MATERIAL_DATA: Record<string, MaterialCalculation> = {
  'drywall': {
    trade: 'Drywall',
    name: '1/2" Sheetrock Drywall (4x8 ft)',
    unitMeasurement: 'Square Feet',
    coveragePerUnit: 32, // 4 x 8 = 32 sq ft
    unitName: 'Sheets',
    defaultWastePercent: 12,
    lowCostPerUnit: 14.50,
    midCostPerUnit: 18.00,
    highCostPerUnit: 24.50, // Moisture resistant / mold tough
    notes: 'Standard 4x8 ft sheets. Includes allowance for tape, joint compound, and drywall screws.',
  },
  'interior_paint': {
    trade: 'Painting',
    name: 'Premium Interior Latex Paint (2 Coats)',
    unitMeasurement: 'Square Feet',
    coveragePerUnit: 175, // 1 gallon covers 350 sq ft 1-coat = 175 sq ft for 2 coats
    unitName: 'Gallons',
    defaultWastePercent: 10,
    lowCostPerUnit: 32.00,
    midCostPerUnit: 54.00,
    highCostPerUnit: 82.00,
    notes: 'Accounts for 2 full coats over primed surfaces. Includes rollers, tape, and drop cloths.',
  },
  'hardwood_flooring': {
    trade: 'Flooring',
    name: 'Engineered / Solid Hardwood Planks',
    unitMeasurement: 'Square Feet',
    coveragePerUnit: 22, // average carton covers 22 sq ft
    unitName: 'Cartons / Boxes',
    defaultWastePercent: 10,
    lowCostPerUnit: 68.00,
    midCostPerUnit: 110.00,
    highCostPerUnit: 185.00,
    notes: 'Oak, maple, or hickory planks. Cartons contain approx 22 sq ft each. Includes underlayment.',
  },
  'tile': {
    trade: 'Tile',
    name: 'Ceramic & Porcelain Floor / Wall Tile',
    unitMeasurement: 'Square Feet',
    coveragePerUnit: 15, // average carton covers 15 sq ft
    unitName: 'Boxes',
    defaultWastePercent: 15, // tile requires higher waste for cuts
    lowCostPerUnit: 35.00,
    midCostPerUnit: 65.00,
    highCostPerUnit: 120.00,
    notes: 'Assumes 12x24" or subway tile. Includes thin-set mortar, spacers, and polymer-modified grout.',
  },
  'roof_shingles': {
    trade: 'Roofing',
    name: 'Architectural Asphalt Shingles',
    unitMeasurement: 'Roof Square (100 Sq Ft)',
    coveragePerUnit: 0.333, // 3 bundles per square (1 bundle = 33.3 sq ft)
    unitName: 'Bundles (3 per Square)',
    defaultWastePercent: 12,
    lowCostPerUnit: 38.00,
    midCostPerUnit: 48.00,
    highCostPerUnit: 65.00,
    notes: '3 bundles equal 1 Roofing Square (100 sq ft). Includes synthetic underlayment, drip edge, and roofing nails.',
  },
  'concrete': {
    trade: 'Concrete',
    name: 'Pre-Mix 4000 PSI Concrete (60 lb Bags)',
    unitMeasurement: 'Cubic Feet (Volume)',
    coveragePerUnit: 0.45, // 1 60lb bag yields ~0.45 cubic feet
    unitName: '60 lb Bags',
    defaultWastePercent: 8,
    lowCostPerUnit: 5.25,
    midCostPerUnit: 6.50,
    highCostPerUnit: 8.75, // Fiber reinforced / quick-setting
    notes: 'Standard 4" thick slab. Formula: (Sq Ft × 0.33 ft thickness) / 0.45 = bags needed.',
  },
};
