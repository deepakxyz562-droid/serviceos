import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CategoryTriageKnowledge {
  category: string;
  label: string;
  typicalCostRange: { min: number; max: number };
  keywords: string[];
  commonIssues: Array<{
    title: string;
    description: string;
    likelihood: 'High' | 'Medium' | 'Low';
    estimatedRange: string;
  }>;
  diagnosticQuestions: string[];
  suggestedUrgency: 'emergency' | 'same_day' | 'this_week' | 'flexible';
}

const KNOWLEDGE_BASE: Record<string, CategoryTriageKnowledge> = {
  hvac: {
    category: 'hvac',
    label: 'HVAC & Air Conditioning',
    typicalCostRange: { min: 175, max: 650 },
    keywords: ['ac', 'cooling', 'heat', 'furnace', 'thermostat', 'blower', 'compressor', 'warm air', 'freezing', 'buzzing', 'fan'],
    commonIssues: [
      {
        title: 'Run/Start Capacitor Failure',
        description: 'Common cause of humming outdoor units and failure of the compressor/fan to spin up.',
        likelihood: 'High',
        estimatedRange: '$150 – $320',
      },
      {
        title: 'Clogged Condensate Drain Line',
        description: 'Safety float switch trips and shuts system down to prevent water damage.',
        likelihood: 'Medium',
        estimatedRange: '$120 – $250',
      },
      {
        title: 'Refrigerant Leak or Low Charge',
        description: 'Causes ice buildup on copper lines and lukewarm airflow inside.',
        likelihood: 'Medium',
        estimatedRange: '$280 – $750',
      },
    ],
    diagnosticQuestions: [
      'Is the outdoor unit spinning or making a humming/clicking sound?',
      'Is the thermostat display turned on and set to COOL?',
      'Are you noticing any ice formation along the indoor or outdoor copper pipes?',
    ],
    suggestedUrgency: 'same_day',
  },
  plumbing: {
    category: 'plumbing',
    label: 'Plumbing & Water Heaters',
    typicalCostRange: { min: 150, max: 800 },
    keywords: ['leak', 'pipe', 'water heater', 'toilet', 'drain', 'faucet', 'clog', 'sewage', 'pressure', 'sink', 'garbage disposal'],
    commonIssues: [
      {
        title: 'Water Heater Heating Element / Thermocouple',
        description: 'Pilot light goes out or electric element fails, resulting in no hot water or rapid cooling.',
        likelihood: 'High',
        estimatedRange: '$180 – $380',
      },
      {
        title: 'Main Line or Fixture Trap Obstruction',
        description: 'Slow drainage or gurgling in multiple fixtures across the home.',
        likelihood: 'Medium',
        estimatedRange: '$200 – $450',
      },
      {
        title: 'Pressure Relief Valve / Tank Corrosion',
        description: 'Water pooling under water heater base indicating valve wear or tank failure.',
        likelihood: 'Medium',
        estimatedRange: '$150 – $1,200',
      },
    ],
    diagnosticQuestions: [
      'Is the leak active and continuous, or only occurring when running water?',
      'Do you know the location of your main water shutoff valve if needed?',
      'Is water draining slowly in one fixture or across the whole house?',
    ],
    suggestedUrgency: 'same_day',
  },
  electrical: {
    category: 'electrical',
    label: 'Electrical & Lighting',
    typicalCostRange: { min: 140, max: 700 },
    keywords: ['breaker', 'outlet', 'spark', 'panel', 'ev charger', 'light', 'flicker', 'switch', 'wiring', 'fuse', 'generator'],
    commonIssues: [
      {
        title: 'GFCI / AFCI Receptacle or Breaker Fault',
        description: 'Tripped safety circuit due to ground fault or aging breaker mechanism.',
        likelihood: 'High',
        estimatedRange: '$130 – $260',
      },
      {
        title: 'Dedicated Line Addition (240V EV / Appliance)',
        description: 'New conduit and breaker run from panel to garage or kitchen.',
        likelihood: 'Medium',
        estimatedRange: '$500 – $1,200',
      },
      {
        title: 'Loose Neutral or Aging Wiring Connection',
        description: 'Causes flickering fixtures or buzzing sounds behind outlet boxes.',
        likelihood: 'Medium',
        estimatedRange: '$175 – $400',
      },
    ],
    diagnosticQuestions: [
      'Have you tried resetting the breaker at the main electrical panel?',
      'Are other outlets or lights on the same circuit also dead?',
      'Did you notice any burning smell, scorch marks, or buzzing sounds?',
    ],
    suggestedUrgency: 'same_day',
  },
  roofing: {
    category: 'roofing',
    label: 'Roofing & Gutters',
    typicalCostRange: { min: 250, max: 1200 },
    keywords: ['roof', 'shingle', 'gutter', 'leak', 'ceiling', 'chimney', 'flashing', 'wind', 'storm', 'hail'],
    commonIssues: [
      {
        title: 'Damaged Flashing or Pipe Boot Seal',
        description: 'Rubber boot deterioration around plumbing vent stacks causing ceiling water spots.',
        likelihood: 'High',
        estimatedRange: '$250 – $550',
      },
      {
        title: 'Wind-Damaged or Missing Shingles',
        description: 'Exposed underlayment allowing storm water penetration into attic space.',
        likelihood: 'High',
        estimatedRange: '$300 – $750',
      },
      {
        title: 'Gutter / Downspout Backflow',
        description: 'Clogged gutter valleys forcing water behind fascia boards.',
        likelihood: 'Medium',
        estimatedRange: '$150 – $350',
      },
    ],
    diagnosticQuestions: [
      'Is the ceiling water spot soft or currently dripping?',
      'When did the leak start — during recent heavy rain or wind?',
      'How old is the current roof if known?',
    ],
    suggestedUrgency: 'same_day',
  },
  handyman: {
    category: 'handyman',
    label: 'Handyman & Home Repairs',
    typicalCostRange: { min: 100, max: 450 },
    keywords: ['drywall', 'door', 'lock', 'mount', 'furniture', 'patch', 'tile', 'caulk', 'cabinet', 'trim', 'deck'],
    commonIssues: [
      {
        title: 'Drywall Repair & Texture Matching',
        description: 'Patching hole, feathering joint compound, and texture blend before paint.',
        likelihood: 'High',
        estimatedRange: '$120 – $300',
      },
      {
        title: 'Door Alignment & Latch Adjustment',
        description: 'Settling or hinge wear preventing smooth latching and deadbolt throw.',
        likelihood: 'High',
        estimatedRange: '$95 – $190',
      },
      {
        title: 'TV Mounting & Heavy Hardware Anchor',
        description: 'Stud locator, bracket installation, and cable concealment in wall.',
        likelihood: 'Medium',
        estimatedRange: '$110 – $220',
      },
    ],
    diagnosticQuestions: [
      'Do you already have the replacement hardware/fixtures, or should the pro supply them?',
      'Are there any height/ladder requirements involved?',
    ],
    suggestedUrgency: 'this_week',
  },
};

/**
 * POST /api/marketplace/ai-triage
 * Analyzes problem description and returns category classification,
 * common root causes, estimated pricing, and diagnostic questions.
 */
export async function POST(req: NextRequest) {
  try {
    const { problemDescription, category } = await req.json();

    if (!problemDescription || problemDescription.trim().length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a problem description for triage analysis.',
      }, { status: 400 });
    }

    const lower = problemDescription.toLowerCase();

    // 1. Detect category if not provided
    let matchedCategory = category || 'hvac';
    let bestScore = 0;

    if (!category) {
      for (const [catKey, data] of Object.entries(KNOWLEDGE_BASE)) {
        let score = 0;
        for (const kw of data.keywords) {
          if (lower.includes(kw)) score += 1;
        }
        if (score > bestScore) {
          bestScore = score;
          matchedCategory = catKey;
        }
      }
    }

    const triageData = KNOWLEDGE_BASE[matchedCategory] || KNOWLEDGE_BASE.hvac;

    // Detect emergency signals
    const isEmergency =
      lower.includes('smoke') ||
      lower.includes('spark') ||
      lower.includes('flooding') ||
      lower.includes('burst') ||
      lower.includes('gas') ||
      lower.includes('no heat') ||
      lower.includes('emergency');

    const urgency = isEmergency ? 'emergency' : triageData.suggestedUrgency;

    return NextResponse.json({
      success: true,
      triage: {
        category: triageData.category,
        categoryLabel: triageData.label,
        urgency,
        isEmergency,
        confidence: bestScore > 0 ? 'high' : 'medium',
        typicalCostRange: triageData.typicalCostRange,
        commonIssues: triageData.commonIssues,
        diagnosticQuestions: triageData.diagnosticQuestions,
        summary: `Our AI triage analyzed your request for ${triageData.label}. Review the suspected components and helpful questions below to get the most accurate quotes.`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Triage failed' }, { status: 500 });
  }
}
