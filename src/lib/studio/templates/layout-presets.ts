/**
 * Fieseros Universal Studio - Layout Presets & Business Kits
 * Pre-configured Elementor trees for Blank, Split Hero, Focus Flow, Document,
 * Landing Page, and Complete Industry Business Kits.
 */

import { StudioNode } from '../schema/node';
import { StudioProject } from '../schema/project';
import { createStudioNode } from '../engine/tree-engine';

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  category: 'layout' | 'business_kit';
  icon: string;
  createTree: (appName?: string, brandColor?: string) => StudioNode;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  // ── 1. SPLIT HERO (Elementor 2-Column Hero Parity) ──
  {
    id: 'split_hero',
    name: '2-Column Split Hero',
    description: 'High-converting hero with media & guarantees on left, form on right',
    category: 'layout',
    icon: 'Columns',
    createTree: (appName = 'Fast & Reliable Professional Service', brandColor = '#059669') => {
      const ts = Date.now().toString(36);
      return {
        id: `root_${ts}`,
        name: 'Split Hero Section',
        nodeType: 'container',
        widgetType: 'container',
        category: 'layout',
        style: {
          display: 'grid',
          colSpan: 12,
          padding: '32px',
          gap: '32px',
          backgroundColor: '#ffffff',
          border: { radius: '28px' },
          shadow: 'xl',
          width: '100%',
        },
        props: {},
        children: [
          // Left Column (Hero & Media & Benefits)
          {
            id: `col_left_${ts}`,
            name: 'Left Hero Column',
            nodeType: 'container',
            widgetType: 'container',
            category: 'layout',
            style: {
              colSpan: 6,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              gap: '16px',
              backgroundColor: '#0f172a',
              border: { radius: '20px' },
              typography: { color: '#ffffff' },
            },
            props: {},
            children: [
              createStudioNode('badge', {
                props: { text: '⭐ 5-Star Rated Service Pro', color: 'amber' },
              }),
              createStudioNode('image', {
                props: {
                  url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
                  alt: 'Service technician',
                },
                style: { border: { radius: '16px' } },
              }),
              createStudioNode('heading', {
                props: { title: appName, htmlTag: 'h2' },
                style: { typography: { fontSize: '24px', fontWeight: 'bold', color: '#ffffff' } },
              }),
              createStudioNode('text', {
                props: { text: 'Fill out the form to receive upfront pricing and 24/7 priority scheduling.' },
                style: { typography: { color: '#94a3b8', fontSize: '13px' } },
              }),
              createStudioNode('list', {
                props: {
                  items: [
                    'Guaranteed response within 15 minutes',
                    'Licensed, insured & background-checked',
                    '100% Price Match & Escrow Guarantee',
                  ],
                },
              }),
            ],
          },

          // Right Column (Interactive Form)
          {
            id: `col_right_${ts}`,
            name: 'Right Form Column',
            nodeType: 'container',
            widgetType: 'container',
            category: 'layout',
            style: {
              colSpan: 6,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              gap: '16px',
              backgroundColor: '#f8fafc',
              border: { radius: '20px' },
            },
            props: {},
            children: [
              createStudioNode('heading', {
                props: { title: 'Request a Quote / Booking', htmlTag: 'h3' },
                style: { typography: { fontSize: '20px', fontWeight: 'bold' } },
              }),
              createStudioNode('text_input', {
                props: { label: 'Full Name', placeholder: 'e.g. John Doe', required: true },
              }),
              createStudioNode('phone_input', {
                props: { label: 'Phone Number', placeholder: '(555) 000-0000', required: true },
                style: { colSpan: 6 },
              }),
              createStudioNode('email_input', {
                props: { label: 'Email Address', placeholder: 'name@example.com', required: true },
                style: { colSpan: 6 },
              }),
              createStudioNode('dropdown', {
                props: {
                  label: 'Select Service Type',
                  options: ['Emergency Diagnostic', 'System Maintenance', 'New Installation', 'Inspection'],
                },
              }),
              createStudioNode('date_picker', {
                props: { label: 'Preferred Service Date', required: true },
                style: { colSpan: 6 },
              }),
              createStudioNode('time_picker', {
                props: { label: 'Arrival Window' },
                style: { colSpan: 6 },
              }),
              createStudioNode('button', {
                props: { label: 'Confirm & Dispatch Pro ⚡' },
                style: { backgroundColor: brandColor, border: { radius: '12px' } },
              }),
            ],
          },
        ],
      };
    },
  },

  // ── 2. LANDING PAGE & COMPLETE APP KIT ──
  {
    id: 'landing_app',
    name: 'Full Business Hub & AI Concierge',
    description: 'Complete multi-section portal with Hero, AI Concierge, Booking, and Reviews',
    category: 'business_kit',
    icon: 'Layers',
    createTree: (appName = 'Apex HVAC & Climate Dispatch', brandColor = '#0284c7') => {
      const ts = Date.now().toString(36);
      return {
        id: `root_${ts}`,
        name: 'Full App Hub',
        nodeType: 'container',
        widgetType: 'container',
        category: 'layout',
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          gap: '24px',
          backgroundColor: '#f8fafc',
          width: '100%',
        },
        props: {},
        children: [
          // 1. Hero Header
          createStudioNode('container', {
            name: 'Hero Banner',
            style: {
              padding: '32px',
              backgroundColor: '#0f172a',
              border: { radius: '24px' },
              typography: { color: '#ffffff' },
            },
            children: [
              createStudioNode('badge', { props: { text: '24/7 Live Emergency Service', color: 'blue' } }),
              createStudioNode('heading', {
                props: { title: appName, htmlTag: 'h1' },
                style: { typography: { fontSize: '32px', fontWeight: 'bold', color: '#ffffff' } },
              }),
              createStudioNode('text', {
                props: { text: 'Book appointment slots, get instant AI estimates, and track technicians in real time.' },
                style: { typography: { color: '#94a3b8' } },
              }),
            ],
          }),

          // 2. Embedded AI Assistant Concierge
          createStudioNode('ai_chat_concierge', {
            props: {
              title: '24/7 AI Service Dispatcher',
              greeting: 'Hello! I am your 24/7 Dispatch Concierge. How can I assist you with your estimate or service today?',
            },
          }),

          // 3. Instant Calculation Field
          createStudioNode('calculation_field', {
            props: {
              label: 'Estimated Instant Quote',
              formula: '= (sqft * 4.50) + 120',
              currencySymbol: '$',
            },
          }),

          // 4. Booking Calendar Slot Picker
          createStudioNode('booking_calendar', {
            props: { title: 'Select Your Appointment Window' },
          }),

          // 5. Service Passport Tile
          createStudioNode('service_passport', {
            props: { title: 'Service Passport™ Equipment History' },
          }),
        ],
      };
    },
  },

  // ── 3. BLANK CANVAS ──
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Empty container ready for custom drag-and-drop building',
    category: 'layout',
    icon: 'SquareDashed',
    createTree: (appName = 'My New Page', brandColor = '#059669') => {
      const ts = Date.now().toString(36);
      return {
        id: `root_${ts}`,
        name: 'Blank Root Container',
        nodeType: 'container',
        widgetType: 'container',
        category: 'layout',
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: '32px',
          gap: '16px',
          backgroundColor: '#ffffff',
          border: { radius: '24px' },
          shadow: 'md',
          width: '100%',
        },
        props: {},
        children: [
          createStudioNode('heading', {
            props: { title: appName, htmlTag: 'h2' },
          }),
          createStudioNode('text', {
            props: { text: 'Drag widgets from the left panel onto this canvas to start designing.' },
          }),
        ],
      };
    },
  },
];
