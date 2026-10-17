/**
 * Trade Safety Presets (SWMS & High-Risk Compliance)
 * ----------------------------------------------------
 * Pre-configured Safe Work Method Statements (SWMS), job safety assessments,
 * and compliance checklists for trade contractors (Electrical, HVAC, Plumbing,
 * Roofing/Heights, and General Pre-Start).
 *
 * Each preset can be loaded with one click in the Checklist Builder, attached to
 * jobs, and executed by field technicians on the employee mobile app or web portal.
 */

export interface PresetQuestion {
  id: string;
  type: 'short_answer' | 'long_answer' | 'dropdown' | 'checkbox' | 'numerical';
  label: string;
  required: boolean;
  options: string[];
}

export interface PresetSection {
  id: string;
  title: string;
  questions: PresetQuestion[];
}

export interface TradeSafetyPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  autoAttachJobs: boolean;
  sections: PresetSection[];
}

export const TRADE_SAFETY_PRESETS: TradeSafetyPreset[] = [
  {
    id: 'preset-swms-prestart',
    title: 'Pre-Start SWMS & Site Risk Assessment',
    category: 'Safety & SWMS',
    description:
      'Mandatory pre-job hazard assessment, PPE verification, and safety sign-off before commencing work on site.',
    autoAttachJobs: true,
    sections: [
      {
        id: 'sec-ppe-hazards',
        title: '1. PPE & Site Hazard Identification',
        questions: [
          {
            id: 'q-ppe-check',
            type: 'checkbox',
            label: 'Required PPE inspected and worn (Steel-cap boots, eye protection, gloves, high-vis)',
            required: true,
            options: [],
          },
          {
            id: 'q-site-hazards',
            type: 'checkbox',
            label: 'Site hazards identified (Slip/trip risks, overhead powerlines, wet surfaces, active traffic)',
            required: true,
            options: [],
          },
          {
            id: 'q-firstaid-contact',
            type: 'checkbox',
            label: 'First aid kit location, emergency assembly point, and site supervisor contact confirmed',
            required: true,
            options: [],
          },
        ],
      },
      {
        id: 'sec-utility-isolation',
        title: '2. Utility Isolation & Energy Control',
        questions: [
          {
            id: 'q-utility-status',
            type: 'dropdown',
            label: 'Utility Isolation Status for this Job',
            required: true,
            options: [
              'Not Applicable — Non-invasive work',
              'Electrical supply isolated & verified de-energized',
              'Main water supply isolated',
              'Gas line isolated & tagged',
              'Lockout / Tagout (LOTO) locks applied',
            ],
          },
          {
            id: 'q-dial-before-dig',
            type: 'checkbox',
            label: 'Underground service location / Dial-Before-You-Dig confirmed (if excavating or drilling)',
            required: false,
            options: [],
          },
        ],
      },
      {
        id: 'sec-safety-signoff',
        title: '3. Pre-Start Safety Sign-off',
        questions: [
          {
            id: 'q-lead-name',
            type: 'short_answer',
            label: 'Lead Technician / Competent Person Name',
            required: true,
            options: [],
          },
          {
            id: 'q-safety-notes',
            type: 'long_answer',
            label: 'Identified Hazards & Risk Control Measures for this Job',
            required: false,
            options: [],
          },
        ],
      },
    ],
  },
  {
    id: 'preset-electrical-loto',
    title: 'Electrical Safety & LOTO Isolation Procedure',
    category: 'Electrical',
    description:
      'Zero-energy verification, lockout/tagout compliance, arc flash safety, and insulation resistance testing.',
    autoAttachJobs: false,
    sections: [
      {
        id: 'sec-elec-isolation',
        title: '1. Isolation & Zero-Energy Verification (NFPA 70E / OSHA)',
        questions: [
          {
            id: 'q-loto-padlock',
            type: 'checkbox',
            label: 'Circuit breaker / isolator switched OFF and personal lockout padlock + tag applied',
            required: true,
            options: [],
          },
          {
            id: 'q-tester-proven',
            type: 'checkbox',
            label: 'Calibrated voltage tester proved on a known live source immediately prior to test',
            required: true,
            options: [],
          },
          {
            id: 'q-zero-volts',
            type: 'checkbox',
            label: 'Zero voltage verified between Line-Neutral, Line-Earth, and Neutral-Earth (0V confirmed)',
            required: true,
            options: [],
          },
        ],
      },
      {
        id: 'sec-elec-ppe',
        title: '2. Arc Flash & Insulation Safety',
        questions: [
          {
            id: 'q-arc-flash',
            type: 'dropdown',
            label: 'Arc Flash Boundary & PPE Level',
            required: true,
            options: [
              'De-energized Non-Hazardous (Standard trade PPE)',
              'Category 1 (4 cal/cm² — Arc face shield + leather gloves)',
              'Category 2 (8 cal/cm² — Full arc suit + face shield)',
              'Category 4 (40 cal/cm² — High-voltage arc flash suit)',
            ],
          },
          {
            id: 'q-insulated-tools',
            type: 'checkbox',
            label: '1000V VDE-rated insulated hand tools used within live panel boundaries',
            required: true,
            options: [],
          },
          {
            id: 'q-insulation-resistance',
            type: 'numerical',
            label: 'Insulation Resistance Test Result (Megohms MΩ)',
            required: false,
            options: [],
          },
        ],
      },
      {
        id: 'sec-elec-restore',
        title: '3. Re-Energization & Earth Continuity',
        questions: [
          {
            id: 'q-tools-clear',
            type: 'checkbox',
            label: 'All tools, jumpers, and technicians completely clear before removing padlocks',
            required: true,
            options: [],
          },
          {
            id: 'q-earth-bonded',
            type: 'checkbox',
            label: 'Equipment chassis earth continuity and polarity tested and confirmed intact',
            required: true,
            options: [],
          },
        ],
      },
    ],
  },
  {
    id: 'preset-hvac-refrigerant',
    title: 'HVAC Refrigerant & Pressure Safety (EPA 608)',
    category: 'HVAC',
    description:
      'Refrigerant recovery protocols, dry nitrogen pressure holding test, micron deep vacuum, and leak verification.',
    autoAttachJobs: false,
    sections: [
      {
        id: 'sec-hvac-ventilation',
        title: '1. Area Safety & Ventilation',
        questions: [
          {
            id: 'q-hvac-vent',
            type: 'checkbox',
            label: 'Adequate mechanical or cross-flow ventilation confirmed (no refrigerant gas accumulation)',
            required: true,
            options: [],
          },
          {
            id: 'q-hvac-sparks',
            type: 'checkbox',
            label: 'No open flames, smoking, or sparking equipment within 5 meters of refrigerant lines',
            required: true,
            options: [],
          },
        ],
      },
      {
        id: 'sec-hvac-recovery',
        title: '2. Refrigerant Handling & EPA Recovery',
        questions: [
          {
            id: 'q-refrig-type',
            type: 'dropdown',
            label: 'Refrigerant Type',
            required: true,
            options: ['R-410A', 'R-32', 'R-134a', 'R-454B (A2L)', 'R-404A', 'R-22'],
          },
          {
            id: 'q-standing-pressure',
            type: 'numerical',
            label: 'Initial Standing Pressure (PSI)',
            required: false,
            options: [],
          },
          {
            id: 'q-refrig-recovered',
            type: 'numerical',
            label: 'Total Refrigerant Recovered or Charged (Lbs / Oz)',
            required: true,
            options: [],
          },
        ],
      },
      {
        id: 'sec-hvac-pressure-vac',
        title: '3. Nitrogen Pressure Test & Deep Vacuum',
        questions: [
          {
            id: 'q-nitrogen-held',
            type: 'checkbox',
            label: 'Dry Nitrogen pressure test held at target PSI for 15+ minutes with zero pressure decay',
            required: true,
            options: [],
          },
          {
            id: 'q-deep-vacuum',
            type: 'numerical',
            label: 'Final Deep Vacuum Level Reached (Microns — target < 500 microns)',
            required: true,
            options: [],
          },
          {
            id: 'q-vacuum-decay',
            type: 'checkbox',
            label: '10-minute vacuum decay test passed (held below 1,000 microns, no moisture/leak)',
            required: true,
            options: [],
          },
        ],
      },
    ],
  },
  {
    id: 'preset-heights-ladder',
    title: 'Working at Heights & Ladder Safety Gate',
    category: 'Safety & SWMS',
    description:
      'Fall prevention, 4:1 ladder setup ratio, 3-point contact, anchor point inspection, and drop-zone perimeter.',
    autoAttachJobs: false,
    sections: [
      {
        id: 'sec-heights-inspect',
        title: '1. Access Equipment & Harness Inspection',
        questions: [
          {
            id: 'q-ladder-condition',
            type: 'checkbox',
            label: 'Ladder inspected: Rungs, stiles, non-slip feet, and spreader locks free of defects',
            required: true,
            options: [],
          },
          {
            id: 'q-harness-condition',
            type: 'checkbox',
            label: 'Fall arrest harness and lanyard inspected for frayed webbing, cuts, or deformed D-rings',
            required: true,
            options: [],
          },
        ],
      },
      {
        id: 'sec-heights-setup',
        title: '2. Setup, Angle & Overhead Clearance',
        questions: [
          {
            id: 'q-ladder-angle',
            type: 'checkbox',
            label: 'Ladder erected at correct 4:1 slope (75-degree angle) on firm, level footing',
            required: true,
            options: [],
          },
          {
            id: 'q-ladder-tied',
            type: 'checkbox',
            label: 'Top of ladder securely tied off to solid structure; extends 1m (3 rungs) past gutter/roof',
            required: true,
            options: [],
          },
          {
            id: 'q-overhead-power',
            type: 'checkbox',
            label: 'Overhead power lines cleared: At least 3 meters (10ft) away from all metal/fiberglass ladders',
            required: true,
            options: [],
          },
          {
            id: 'q-drop-zone',
            type: 'checkbox',
            label: 'Ground drop zone barricaded or flagged off to protect bystanders from falling objects',
            required: true,
            options: [],
          },
        ],
      },
      {
        id: 'sec-heights-rules',
        title: '3. Ascending & Work Execution Rules',
        questions: [
          {
            id: 'q-three-point',
            type: 'checkbox',
            label: 'Technician commits to maintaining 3 points of contact at all times while climbing',
            required: true,
            options: [],
          },
          {
            id: 'q-anchor-point',
            type: 'short_answer',
            label: 'Rated Fall Arrest Anchor Point Used (e.g. Roof Anchor, Trusses, Scaffold Post)',
            required: false,
            options: [],
          },
        ],
      },
    ],
  },
  {
    id: 'preset-plumbing-leak-barrier',
    title: 'Plumbing Water Damage Prevention & Gas Safety',
    category: 'Plumbing',
    description:
      'Water main shutoff verification, pressure testing, gas leak electronic sniff, and flood containment.',
    autoAttachJobs: false,
    sections: [
      {
        id: 'sec-plumb-shutoff',
        title: '1. Water & Gas Supply Isolation',
        questions: [
          {
            id: 'q-water-shutoff-tested',
            type: 'checkbox',
            label: 'Main water isolation valve tested and verified holding 100% before opening pipes',
            required: true,
            options: [],
          },
          {
            id: 'q-gas-shutoff-tested',
            type: 'checkbox',
            label: 'Gas service cock valve shut and downstream gas line depressurized (if working on gas appliances)',
            required: false,
            options: [],
          },
          {
            id: 'q-flood-tarps',
            type: 'checkbox',
            label: 'Drip trays, catch buckets, and waterproof drop sheets placed under all work areas',
            required: true,
            options: [],
          },
        ],
      },
      {
        id: 'sec-plumb-test',
        title: '2. Pressure Testing & Gas Sniff',
        questions: [
          {
            id: 'q-static-pressure',
            type: 'numerical',
            label: 'Static Water Supply Pressure (PSI — normal 45–75 PSI)',
            required: false,
            options: [],
          },
          {
            id: 'q-hydro-held',
            type: 'checkbox',
            label: 'Hydrostatic pressure test on new piping held for 15 minutes with zero drip/drop',
            required: true,
            options: [],
          },
          {
            id: 'q-gas-sniff-passed',
            type: 'checkbox',
            label: 'Electronic combustible gas leak detector or bubble solution test showed zero bubbles',
            required: true,
            options: [],
          },
        ],
      },
      {
        id: 'sec-plumb-signoff',
        title: '3. Handover & Water Heater Safety',
        questions: [
          {
            id: 'q-tpr-valve',
            type: 'checkbox',
            label: 'Water heater temperature-pressure relief (TPR) valve tested and drain discharge line clear',
            required: true,
            options: [],
          },
          {
            id: 'q-meter-sweep',
            type: 'checkbox',
            label: 'Water meter flow indicator checked after all valves reopened (flow wheel stationary = no leaks)',
            required: true,
            options: [],
          },
        ],
      },
    ],
  },
];
