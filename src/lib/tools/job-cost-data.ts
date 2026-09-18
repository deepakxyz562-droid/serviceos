/**
 * Shared benchmark data and calculation formulas for the Free Tools Suite.
 */

// ─── 1. Currency & Formatting ─────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const formatDollar = formatCurrency;

// ─── 2. Job Cost Benchmarks & Calculator ──────────────────────────────────────

export type ProjectScope = 'minor' | 'standard' | 'major';
export type MaterialQuality = 'economy' | 'standard' | 'premium';

export interface ServiceCostItem {
  id: string;
  name: string;
  category: string;
  baseTypicalCost: number;
  description: string;
  typicalLaborHours: number;
  completionTimeframe: string;
  factors: string[];
}

export type ServiceCostBenchmark = ServiceCostItem;

export const SERVICE_COST_DATA: ServiceCostItem[] = [
  {
    id: 'hvac_tuneup',
    name: 'HVAC Complete System Replacement',
    category: 'hvac',
    baseTypicalCost: 8500,
    description: 'Full removal and installation of a 16+ SEER2 heat pump or AC system with matching gas furnace / air handler.',
    typicalLaborHours: 12,
    completionTimeframe: '1–2 Days',
    factors: [
      'System tonnage (2.5 to 5.0 ton sizing)',
      'Ductwork modification or zoning requirements',
      'SEER2 energy efficiency rating & heat pump vs AC',
      'Permits, electrical whip, and refrigerant line set'
    ],
  },
  {
    id: 'hvac_repair',
    name: 'HVAC Diagnostics & Compressor Repair',
    category: 'hvac',
    baseTypicalCost: 650,
    description: 'Comprehensive diagnostic call, capacitor / contactor replacement, blower motor tune-up, and refrigerant recharge.',
    typicalLaborHours: 3,
    completionTimeframe: '2–4 Hours',
    factors: [
      'Refrigerant type (R-410A vs legacy R-22)',
      'Compressor vs electrical motor failure',
      'Emergency after-hours or weekend service rates'
    ],
  },
  {
    id: 'plumbing_water_heater',
    name: 'Water Heater Replacement (Tank & Tankless)',
    category: 'plumbing',
    baseTypicalCost: 2200,
    description: 'Supply and installation of a 50-gallon high-efficiency water heater or on-demand tankless conversion with expansion tank.',
    typicalLaborHours: 5,
    completionTimeframe: '4–6 Hours',
    factors: [
      'Tank style (conventional atmospheric vs tankless direct-vent)',
      'Gas line / electrical circuit upgrades',
      'Expansion tank, thermal relief valve, and code updates'
    ],
  },
  {
    id: 'plumbing_repiping',
    name: 'Whole-Home Plumbing Repipe / Drain Clear',
    category: 'plumbing',
    baseTypicalCost: 4800,
    description: 'Replacement of corroded galvanized or polybutylene pipes with modern PEX-A supply lines throughout the house.',
    typicalLaborHours: 20,
    completionTimeframe: '2–4 Days',
    factors: [
      'Number of bathrooms and plumbing fixtures',
      'Crawlspace vs slab foundation access',
      'Drywall patching and restoration scope'
    ],
  },
  {
    id: 'electrical_panel',
    name: '200-Amp Electrical Panel Upgrade',
    category: 'electrical',
    baseTypicalCost: 3200,
    description: 'Upgrade from outdated 100A panel to 200A service panel with whole-home surge protection and dedicated EV circuits.',
    typicalLaborHours: 8,
    completionTimeframe: '1 Day',
    factors: [
      'Utility company meter box and service mast requirements',
      'City permitting and electrical inspection turnaround',
      'AFCI / GFCI dual-function breakers inclusion'
    ],
  },
  {
    id: 'electrical_rewiring',
    name: 'Lighting & EV Charger Installation',
    category: 'electrical',
    baseTypicalCost: 1450,
    description: 'Level 2 EV charger 240V/50A line run and recessed LED can light layout in living/kitchen areas.',
    typicalLaborHours: 4,
    completionTimeframe: '4–6 Hours',
    factors: [
      'Distance from panel to garage / charging location',
      'Attic access and conduit concealment',
      'Smart dimmer and automation integration'
    ],
  },
  {
    id: 'roofing_replacement',
    name: 'Architectural Shingle Roof Replacement',
    category: 'roofing',
    baseTypicalCost: 11200,
    description: 'Complete tear-off of old shingles, synthetic underlayment, ice/water barrier, drip edge, ridge vent, and 30-year shingles.',
    typicalLaborHours: 24,
    completionTimeframe: '1–2 Days',
    factors: [
      'Roof pitch and steep-slope staging safety',
      'Number of layers being torn off',
      'Plywood decking rot replacement',
      'Valley flashing and chimney flashing rebuild'
    ],
  },
  {
    id: 'remodeling_kitchen',
    name: 'Midrange to Upscale Kitchen Remodel',
    category: 'remodeling',
    baseTypicalCost: 28500,
    description: 'Solid wood shaker cabinets, quartz countertops, subway tile backsplash, under-mount sink, and luxury lighting fixtures.',
    typicalLaborHours: 120,
    completionTimeframe: '3–5 Weeks',
    factors: [
      'Custom vs semi-custom cabinetry',
      'Quartz vs granite slab square footage',
      'Layout alteration (knocking down non-load-bearing walls)'
    ],
  },
  {
    id: 'remodeling_bathroom',
    name: 'Master / Guest Bathroom Renovation',
    category: 'remodeling',
    baseTypicalCost: 14500,
    description: 'Custom tiled walk-in shower with Schluter waterproofing, double vanity, modern fixtures, comfort-height toilet, and ventilation.',
    typicalLaborHours: 70,
    completionTimeframe: '2–3 Weeks',
    factors: [
      'Tile format and mosaic shower pan detailing',
      'Plumbing rough-in relocations',
      'Frameless glass enclosure dimensions'
    ],
  },
  {
    id: 'painting_interior',
    name: 'Whole-Home Interior Painting',
    category: 'painting',
    baseTypicalCost: 3800,
    description: 'Wall preparation, minor hole patching, premium primer, and 2 finish coats of low-VOC Sherwin-Williams or Benjamin Moore paint.',
    typicalLaborHours: 28,
    completionTimeframe: '3–4 Days',
    factors: [
      'Ceiling height and staircase complexity',
      'Trim, baseboards, and door casing painting',
      'Color change contrast (dark to light requires extra coat)'
    ],
  },
  {
    id: 'painting_exterior',
    name: 'Exterior Siding & Trim Painting',
    category: 'painting',
    baseTypicalCost: 4600,
    description: 'Pressure wash, scraping, elastomeric caulking, bonding primer, and 2 coats of weather-resistant acrylic latex.',
    typicalLaborHours: 35,
    completionTimeframe: '4–5 Days',
    factors: [
      'Multi-story scaffolding and masking needs',
      'Wood rot repair or siding board replacement',
      'Fascia, soffits, and architectural corbel detailing'
    ],
  },
  {
    id: 'flooring_hardwood',
    name: 'Hardwood / Luxury Vinyl Plank (LVP) Flooring',
    category: 'flooring',
    baseTypicalCost: 4200,
    description: 'Subfloor leveling, soundproof moisture underlayment, seamless flooring installation, transition strips, and quarter-round trim.',
    typicalLaborHours: 18,
    completionTimeframe: '2–3 Days',
    factors: [
      'Engineered hardwood vs 20mil LVP wear layer',
      'Existing carpet / tile demolition and disposal',
      'Subfloor leveling compound requirements'
    ],
  },
  {
    id: 'landscaping_design',
    name: 'Full Yard Landscaping & Hardscape Patio',
    category: 'landscaping',
    baseTypicalCost: 7400,
    description: 'Grading, sod installation, perennial garden beds with drip irrigation, mulch, and a 300 sq ft paver stone patio.',
    typicalLaborHours: 30,
    completionTimeframe: '3–5 Days',
    factors: [
      'Paver base excavation depth and compaction',
      'Drip irrigation automation zones',
      'Retaining wall or slope stabilization needs'
    ],
  },
  {
    id: 'cleaning_deep',
    name: 'Deep Move-In / Move-Out House Cleaning',
    category: 'cleaning',
    baseTypicalCost: 380,
    description: 'Top-to-bottom scrub including inside oven, refrigerator, baseboards, interior windows, cabinet interiors, and sanitized bathrooms.',
    typicalLaborHours: 8,
    completionTimeframe: '4–6 Hours',
    factors: [
      'Square footage and pet hair / grime levels',
      'Add-ons (carpet steam extraction, high chandelier dusting)'
    ],
  },
  {
    id: 'drywall_repair',
    name: 'Drywall Hanging, Taping & Texture Matching',
    category: 'drywall',
    baseTypicalCost: 1100,
    description: 'Sheetrock hanging, 3-coat mud application, feathering, seamless orange peel or knockdown texture match, and smooth sand finish.',
    typicalLaborHours: 10,
    completionTimeframe: '1–2 Days',
    factors: [
      'Ceiling vs vertical wall patch locations',
      'Water damage remediation backing',
      'Level 4 or Level 5 smooth wall finish request'
    ],
  },
];

export function getRegionalMultiplier(zip: string): {
  multiplier: number;
  region: string;
  tier: string;
  mult: number;
  label: string;
} {
  if (!zip || zip.length < 3) {
    return {
      multiplier: 1.0,
      region: 'National Average',
      tier: 'Standard',
      mult: 1.0,
      label: 'National Average',
    };
  }

  const prefix = parseInt(zip.substring(0, 3), 10);
  if (isNaN(prefix)) {
    return {
      multiplier: 1.0,
      region: 'National Average',
      tier: 'Standard',
      mult: 1.0,
      label: 'National Average',
    };
  }

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
    return {
      multiplier: 1.25,
      region: 'High-Cost Coastal Metro',
      tier: 'high',
      mult: 1.25,
      label: 'Metro / High-Cost Area (+25%)',
    };
  }

  // Moderate cost metro areas
  // Chicago (600-629), Atlanta (300-319), Texas metros (750-799), Florida (330-349), Philly (190-196), Denver (800-816)
  if (
    (prefix >= 600 && prefix <= 629) ||
    (prefix >= 300 && prefix <= 319) ||
    (prefix >= 750 && prefix <= 799) ||
    (prefix >= 330 && prefix <= 349) ||
    (prefix >= 190 && prefix <= 196) ||
    (prefix >= 800 && prefix <= 816)
  ) {
    return {
      multiplier: 1.05,
      region: 'Major Metro Area',
      tier: 'moderate',
      mult: 1.05,
      label: 'Moderate Metro Area (+5%)',
    };
  }

  // Lower cost of living / regional areas
  return {
    multiplier: 0.90,
    region: 'Suburban / Regional Market',
    tier: 'standard',
    mult: 0.90,
    label: 'Regional / Lower-Cost Area (-10%)',
  };
}

export function calculateJobCost(
  service: ServiceCostItem,
  scope: ProjectScope,
  quality: MaterialQuality,
  zipCode: string
): {
  typicalCost: number;
  lowCost: number;
  highCost: number;
  laborCost: number;
  materialsCost: number;
} {
  const scopeMultipliers: Record<ProjectScope, number> = {
    minor: 0.55,
    standard: 1.0,
    major: 2.1,
  };

  const qualityMultipliers: Record<MaterialQuality, number> = {
    economy: 0.85,
    standard: 1.0,
    premium: 1.45,
  };

  const reg = getRegionalMultiplier(zipCode);
  const baseCost = (service?.baseTypicalCost || 1000) * scopeMultipliers[scope] * qualityMultipliers[quality] * reg.multiplier;

  const laborRatio = 0.55;
  const laborCost = Math.round(baseCost * laborRatio);
  const materialsCost = Math.round(baseCost * (1 - laborRatio));
  const typicalCost = laborCost + materialsCost;
  const lowCost = Math.round(typicalCost * 0.82);
  const highCost = Math.round(typicalCost * 1.28);

  return {
    typicalCost,
    lowCost,
    highCost,
    laborCost,
    materialsCost,
  };
}

// ─── 3. Renovation ROI Benchmarks ─────────────────────────────────────────────

export interface RenovationProject {
  id: string;
  name: string;
  category: string;
  typicalCost: number;
  roiPercentage: number;
  description: string;
}

export const RENOVATION_PROJECTS: RenovationProject[] = [
  {
    id: 'garage_door',
    name: 'Garage Door Replacement',
    category: 'Exterior & Curb',
    typicalCost: 4500,
    roiPercentage: 102.7,
    description: 'High-tensile insulated steel door with heavy-duty tracks. Consistently ranks #1 in Remodeling Magazine Cost vs. Value report.',
  },
  {
    id: 'minor_kitchen',
    name: 'Minor Kitchen Remodel',
    category: 'Kitchen & Bath',
    typicalCost: 26500,
    roiPercentage: 85.7,
    description: 'Cabinet refacing, new hardware, energy-efficient cooktop/oven, mid-range quartz countertops, and modern sink/faucet.',
  },
  {
    id: 'entry_door',
    name: 'Steel Front Entry Door',
    category: 'Exterior & Curb',
    typicalCost: 2200,
    roiPercentage: 100.9,
    description: 'Pre-hung 20-gauge steel door with dual-pane decorative glass and heavy-duty lockset. Boosts immediate curb appeal.',
  },
  {
    id: 'wood_deck',
    name: 'Wood Deck Addition (16x20 ft)',
    category: 'Exterior & Curb',
    typicalCost: 17200,
    roiPercentage: 68.2,
    description: 'Pressure-treated pine decking with built-in bench, railings, and single set of stairs.',
  },
  {
    id: 'bathroom_remodel',
    name: 'Midrange Bathroom Remodel',
    category: 'Kitchen & Bath',
    typicalCost: 24500,
    roiPercentage: 66.7,
    description: 'Porcelain tub with ceramic tile surround, recessed medicine cabinet, stone vanity top, and updated exhaust fan.',
  },
  {
    id: 'heat_pump_hvac',
    name: 'High-Efficiency Heat Pump HVAC',
    category: 'Energy & HVAC',
    typicalCost: 11800,
    roiPercentage: 74.0,
    description: 'Inverter-driven multi-stage heat pump (SEER2 18+). Qualifies for federal tax credits and slashes annual heating/cooling bills.',
  },
  {
    id: 'hardwood_refinish',
    name: 'Hardwood Flooring Refinish / Install',
    category: 'Interior & Living',
    typicalCost: 5400,
    roiPercentage: 118.0,
    description: 'Sand existing solid oak floors to bare wood, stain, and apply 3 coats polyurethane. Top interior project requested by buyers.',
  },
  {
    id: 'vinyl_windows',
    name: 'Vinyl Window Replacement (10 Units)',
    category: 'Energy & HVAC',
    typicalCost: 20000,
    roiPercentage: 69.5,
    description: 'Low-E, argon gas-filled double-hung windows with custom exterior trim cladding. Reduces drafts and exterior street noise.',
  },
  {
    id: 'major_kitchen',
    name: 'Major Luxury Kitchen Remodel',
    category: 'Kitchen & Bath',
    typicalCost: 78000,
    roiPercentage: 54.0,
    description: 'Custom hardwood cabinetry, commercial-grade ranges/ovens, built-in panel-ready refrigeration, and large marble island.',
  },
  {
    id: 'exterior_siding',
    name: 'Fiber-Cement Siding Replacement',
    category: 'Exterior & Curb',
    typicalCost: 19500,
    roiPercentage: 88.5,
    description: 'Non-combustible James Hardie lap siding with factory ColorPlus finish. Rot-proof, pest-proof, and weather resistant.',
  },
];

// ─── 4. Home Maintenance Seasonal Tasks ───────────────────────────────────────

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface MaintenanceTask {
  id: string;
  title: string;
  category: string;
  description: string;
  diyFriendly: boolean;
  frequency: string;
  estCost: number;
}

export const SEASONAL_MAINTENANCE_TASKS: Record<Season, MaintenanceTask[]> = {
  spring: [
    {
      id: 'sp_1',
      title: 'Clean Gutters & Inspect Downspouts',
      category: 'Roof & Exterior',
      description: 'Clear winter debris and leaves from all gutters. Flush downspouts to verify unobstructed water drainage away from foundation.',
      diyFriendly: true,
      frequency: 'Every Spring & Fall',
      estCost: 45,
    },
    {
      id: 'sp_2',
      title: 'A/C Condenser Coil Cleaning & Filter Change',
      category: 'HVAC',
      description: 'Clear brush within 3 feet of outdoor AC condenser, gently rinse aluminum fins, and replace indoor high-MERV air filters.',
      diyFriendly: true,
      frequency: 'Every 3 Months',
      estCost: 35,
    },
    {
      id: 'sp_3',
      title: 'Test Sump Pump Operation & Check Basin',
      category: 'Plumbing',
      description: 'Pour 5 gallons of water into basin to ensure float switch triggers pump and discharges water quickly away from basement wall.',
      diyFriendly: true,
      frequency: 'Every Spring',
      estCost: 0,
    },
    {
      id: 'sp_4',
      title: 'Inspect Roof Shingles & Flashing for Winter Damage',
      category: 'Roofing',
      description: 'Check for missing, buckled, or cracked asphalt shingles and inspect chimney and plumbing pipe vent boot collars.',
      diyFriendly: false,
      frequency: 'Annual Inspection',
      estCost: 150,
    },
    {
      id: 'sp_5',
      title: 'Irrigation Sprinkler Startup & Backflow Check',
      category: 'Landscaping',
      description: 'Slowly pressurize sprinkler mainline, inspect heads for broken spray nozzles, and verify backflow preventer valve.',
      diyFriendly: true,
      frequency: 'Every Spring',
      estCost: 60,
    },
  ],
  summer: [
    {
      id: 'su_1',
      title: 'Flush Water Heater Tank Sediment',
      category: 'Plumbing',
      description: 'Connect garden hose to tank drain valve and purge sediment buildup from bottom of water heater to improve heating efficiency.',
      diyFriendly: true,
      frequency: 'Annual Drain',
      estCost: 15,
    },
    {
      id: 'su_2',
      title: 'Inspect Deck Boards & Re-seal UV Stain',
      category: 'Exterior',
      description: 'Perform water droplet test on wood decking. If water absorbs immediately, wash and apply penetrating UV sealant.',
      diyFriendly: true,
      frequency: 'Every 1–2 Years',
      estCost: 85,
    },
    {
      id: 'su_3',
      title: 'Clean Clothes Dryer Exhaust Duct & Lint Trap',
      category: 'Fire Safety',
      description: 'Disconnect rear dryer vent duct and vacuum out accumulated lint all the way to exterior exhaust hood to prevent fire hazard.',
      diyFriendly: true,
      frequency: 'Every 6 Months',
      estCost: 25,
    },
    {
      id: 'su_4',
      title: 'Pest Barrier Foundation Spray & Inspection',
      category: 'Pest Control',
      description: 'Apply perimeter insect barrier spray around foundation, door sills, and crawl space entryways.',
      diyFriendly: true,
      frequency: 'Quarterly',
      estCost: 40,
    },
  ],
  fall: [
    {
      id: 'fa_1',
      title: 'Heating System & Furnace Professional Tune-up',
      category: 'HVAC',
      description: 'Professional furnace inspection: test heat exchanger for carbon monoxide leaks, clean flame sensors, and verify safety shutoffs.',
      diyFriendly: false,
      frequency: 'Annual Fall Check',
      estCost: 125,
    },
    {
      id: 'fa_2',
      title: 'Shut Off & Drain Outdoor Hose Spigots',
      category: 'Plumbing',
      description: 'Close interior isolation shutoff valves for exterior hose bibs and open exterior spigots to drain trapped water before freeze.',
      diyFriendly: true,
      frequency: 'Every Late Autumn',
      estCost: 0,
    },
    {
      id: 'fa_3',
      title: 'Weatherstrip Windows & Exterior Doors',
      category: 'Energy Efficiency',
      description: 'Inspect door sweeps and window frame seals for daylight gaps. Install silicone door seals and exterior caulking.',
      diyFriendly: true,
      frequency: 'Annual Review',
      estCost: 40,
    },
    {
      id: 'fa_4',
      title: 'Chimney & Fireplace Flue Inspection',
      category: 'Fire Safety',
      description: 'Inspect flue damper and check chimney crown for creosote accumulation and animal nests prior to winter wood burning.',
      diyFriendly: false,
      frequency: 'Annual Fall',
      estCost: 180,
    },
  ],
  winter: [
    {
      id: 'wi_1',
      title: 'Test Smoke & Carbon Monoxide Detectors',
      category: 'Life Safety',
      description: 'Press test buttons on all alarms on every floor. Replace 9V backup batteries and replace any alarm units older than 10 years.',
      diyFriendly: true,
      frequency: 'Every 6 Months',
      estCost: 20,
    },
    {
      id: 'wi_2',
      title: 'Check Attic Insulation & Ice Dam Ventilation',
      category: 'Roof & Attic',
      description: 'Ensure attic floor insulation is uniform and soffit baffles are unobstructed so cool air circulates under roof deck.',
      diyFriendly: true,
      frequency: 'Every Winter',
      estCost: 0,
    },
    {
      id: 'wi_3',
      title: 'Prevent Under-Sink Pipe Freeze in Cold Snaps',
      category: 'Plumbing',
      description: 'During sub-zero cold waves, leave cabinet doors open under kitchen/bathroom sinks located on exterior walls and allow trickle.',
      diyFriendly: true,
      frequency: 'During Freezes',
      estCost: 0,
    },
  ],
};

// ─── 5. Trade Material Formulas ───────────────────────────────────────────────

export interface TradeMaterial {
  id: string;
  name: string;
  unitLabel: string;
  costPerUnit: number;
  unitCoverageSqFt: number;
  recommendedWastePercent: number;
  description: string;
}

export const TRADE_MATERIAL_DATA: TradeMaterial[] = [
  {
    id: 'drywall',
    name: 'Drywall Sheets',
    unitLabel: 'Sheet (4x8 ft)',
    costPerUnit: 18.5,
    unitCoverageSqFt: 32,
    recommendedWastePercent: 10,
    description: 'Standard 1/2" Gypsum drywall panels (32 sq ft per sheet) including joint tape, joint compound mud, and coarse drywall screws.',
  },
  {
    id: 'paint',
    name: 'Interior Paint',
    unitLabel: 'Gallon (2-coat)',
    costPerUnit: 56.0,
    unitCoverageSqFt: 175,
    recommendedWastePercent: 10,
    description: 'Premium washable interior acrylic latex paint. One gallon covers approx 350 sq ft single coat (175 sq ft for 2 full coats).',
  },
  {
    id: 'flooring',
    name: 'LVP / Hardwood',
    unitLabel: 'Box (22 sq ft)',
    costPerUnit: 88.0,
    unitCoverageSqFt: 22,
    recommendedWastePercent: 10,
    description: 'Luxury vinyl plank (20mil wear layer) or engineered hardwood flooring with attached acoustic underlayment backing.',
  },
  {
    id: 'tile',
    name: 'Porcelain Tile',
    unitLabel: 'Box (15 sq ft)',
    costPerUnit: 64.0,
    unitCoverageSqFt: 15,
    recommendedWastePercent: 15,
    description: '12x24 inch rectified porcelain tile, polymer-modified thin-set mortar, leveling clips, and stain-resistant grout.',
  },
  {
    id: 'roofing',
    name: 'Roof Shingles',
    unitLabel: 'Bundle (33 sq ft)',
    costPerUnit: 46.0,
    unitCoverageSqFt: 33.3,
    recommendedWastePercent: 12,
    description: 'Architectural dimensional asphalt shingles (3 bundles per 100 sq ft roof square), synthetic underlayment, and coil nails.',
  },
  {
    id: 'concrete',
    name: 'Pre-Mix Concrete',
    unitLabel: '60lb Bag (0.45 cu ft)',
    costPerUnit: 6.75,
    unitCoverageSqFt: 1.35,
    recommendedWastePercent: 8,
    description: '4000 PSI high-strength concrete mix for slabs, footings, and post anchors. At 4" thickness, 1 bag covers 1.35 sq ft.',
  },
];
