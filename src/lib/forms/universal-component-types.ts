/**
 * Universal Component & Application Schema ("Elementor for AI Business Apps")
 * Defines the unified component tree for Forms, AI Agents, Apps, and Data.
 */

export type ComponentType =
  // ── Layout & Containers ──
  | 'container'
  | 'section'
  | 'split_hero'
  | 'grid_12'
  | 'divider'
  | 'spacer'
  // ── Content & Typography ──
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'video'
  | 'map_pin'
  | 'badge'
  | 'button'
  // ── Form Inputs ──
  | 'text_input'
  | 'email_input'
  | 'phone_input'
  | 'number_input'
  | 'dropdown'
  | 'radio_group'
  | 'checkbox_group'
  | 'date_picker'
  | 'time_picker'
  | 'file_upload'
  | 'digital_signature'
  | 'star_rating'
  | 'scale_rating'
  | 'calculation_field'
  // ── AI Blocks ──
  | 'ai_chat_concierge'
  | 'ai_smart_fastfill'
  | 'ai_lead_qualifier'
  | 'ai_voice_caller'
  // ── Business & E-Commerce ──
  | 'product_card_grid'
  | 'stripe_checkout'
  | 'calendar_slot_picker'
  | 'service_catalog_list'
  | 'service_passport_tile'
  | 'whatsapp_action_button'
  | 'call_action_button';

export interface UniversalComponentNode {
  id: string;
  type: ComponentType;
  name: string;
  category: 'layout' | 'content' | 'form' | 'ai' | 'business' | 'data';
  
  // Nested child components (Elementor hierarchy)
  children?: UniversalComponentNode[];
  parentId?: string | null;

  // Style & Appearance (Inspector Tab 1)
  style: {
    layout?: 'column' | 'row' | 'grid' | 'split_hero';
    colSpan?: 1 | 2 | 3 | 4 | 6 | 12;
    width?: 'auto' | 'full' | string;
    padding?: string;
    margin?: string;
    backgroundColor?: string;
    backgroundImageUrl?: string | null;
    backgroundBlur?: string;
    overlayOpacity?: number;
    typography?: {
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
      color?: string;
      alignment?: 'left' | 'center' | 'right';
    };
    border?: {
      radius?: string;
      width?: string;
      color?: string;
    };
    shadow?: 'none' | 'sm' | 'md' | 'lg' | '2xl' | 'glass';
    responsive?: {
      hideOnMobile?: boolean;
      hideOnDesktop?: boolean;
    };
  };

  // Content & Business Properties (Inspector Tab 2)
  props: {
    label?: string;
    placeholder?: string;
    defaultValue?: any;
    helpText?: string;
    options?: Array<{ label: string; value: string; price?: number; icon?: string }>;
    required?: boolean;
    validationRegex?: string;
    min?: number;
    max?: number;
    
    // Calculations & Math formulas (Cognito Parity)
    calculationFormula?: string;
    currencySymbol?: string;
    decimalPlaces?: number;

    // AI Agent Specific Props
    aiPrompt?: string;
    knowledgeSourceIds?: string[];
    voiceTone?: 'friendly' | 'professional' | 'medical' | 'sales' | 'empathetic';
    greetingText?: string;
    quickPrompts?: string[];

    // Media & Visuals
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'map' | 'gradient';
    mapAddress?: string;
    mapServiceRadius?: string;
    badgeText?: string;
    buttonText?: string;
    icon?: string;
  };

  // Behavior & Click Actions (Inspector Tab 3)
  behavior?: {
    conditionalLogic?: {
      action: 'show' | 'hide' | 'require' | 'disable';
      conditions: Array<{
        fieldId: string;
        operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty';
        value: any;
      }>;
      matchType: 'all' | 'any';
    };
    onClickAction?: {
      type:
        | 'submit_form'
        | 'open_sub_form'
        | 'trigger_ai_agent'
        | 'book_calendar'
        | 'stripe_checkout'
        | 'navigate_page'
        | 'call_phone'
        | 'open_whatsapp';
      targetId?: string;
      payload?: Record<string, any>;
    };
    onCompleteWorkflowId?: string;
  };
}

export interface UniversalProject {
  id: string;
  slug: string;
  name: string;
  description?: string;
  industry: string;
  brandColor: string;
  logoUrl?: string;
  
  // Root Component Tree
  rootNode: UniversalComponentNode;
  
  // Linked Atomic Assets
  forms: Array<{ id: string; name: string; slug: string; fieldCount: number }>;
  agents: Array<{ id: string; name: string; slug: string; roleTitle: string }>;
  apps: Array<{ id: string; name: string; slug: string; icon: string }>;
  
  // PWA & Shell Settings
  pwa: {
    enabled: boolean;
    appName: string;
    shortName: string;
    themeColor: string;
    backgroundColor: string;
    display: 'standalone' | 'fullscreen' | 'minimal-ui';
    startUrl: string;
    iconUrl?: string;
  };

  createdAt: string;
  updatedAt: string;
}
