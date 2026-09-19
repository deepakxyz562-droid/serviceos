/**
 * Fieseros Universal Studio - Node & Component Schema
 * Defines the core AST for Containers, Widgets, Styles, Responsive Breakpoints,
 * Logic Conditions, Data Bindings, and Actions.
 */

export type StudioNodeType = 'container' | 'widget';

export type StudioWidgetCategory =
  | 'layout'
  | 'basic'
  | 'form'
  | 'ai'
  | 'business'
  | 'data'
  | 'advanced'
  | 'global';

export type StudioWidgetType =
  // ── Layout ──
  | 'container'
  | 'grid'
  | 'columns'
  | 'spacer'
  | 'divider'
  | 'tabs'
  | 'accordion'
  // ── Basic ──
  | 'heading'
  | 'text'
  | 'rich_text'
  | 'image'
  | 'image_gallery'
  | 'video'
  | 'icon'
  | 'button'
  | 'badge'
  | 'list'
  // ── Form ──
  | 'form_container'
  | 'text_input'
  | 'email_input'
  | 'phone_input'
  | 'number_input'
  | 'textarea_input'
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
  | 'address_input'
  // ── AI ──
  | 'ai_chat_concierge'
  | 'ai_smart_fastfill'
  | 'ai_lead_qualifier'
  | 'ai_voice_caller'
  | 'ai_recommendation_card'
  // ── Business ──
  | 'booking_calendar'
  | 'stripe_checkout'
  | 'service_catalog'
  | 'product_card'
  | 'quote_calculator'
  | 'service_passport'
  | 'map_location'
  | 'reviews_wall'
  | 'whatsapp_button'
  | 'phone_call_button'
  // ── Data ──
  | 'data_table'
  | 'record_view'
  | 'card_grid'
  | 'stat_metric'
  // ── Advanced ──
  | 'custom_html'
  | 'webhook_button'
  | 'global_symbol';

export interface ResponsiveStyleProps {
  colSpan?: 1 | 2 | 3 | 4 | 6 | 12;
  width?: string;
  height?: string;
  minHeight?: string;
  padding?: string;
  margin?: string;
  display?: 'flex' | 'grid' | 'block' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  gap?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: string;
  lineHeight?: string;
  hideOnDesktop?: boolean;
  hideOnTablet?: boolean;
  hideOnMobile?: boolean;
}

export interface StudioNodeStyle extends ResponsiveStyleProps {
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
  backgroundBlur?: string;
  backgroundOverlay?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
    color?: string;
    alignment?: 'left' | 'center' | 'right' | 'justify';
    letterSpacing?: string;
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  };
  border?: {
    width?: string;
    color?: string;
    radius?: string;
    style?: 'solid' | 'dashed' | 'dotted' | 'none';
  };
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'glass' | 'inner';
  opacity?: number;
  zIndex?: number;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  customCss?: string;
  tablet?: ResponsiveStyleProps;
  mobile?: ResponsiveStyleProps;
}

export interface DataBindingConfig {
  sourceType: 'static' | 'dynamic_tag' | 'crm_customer' | 'crm_job' | 'database_table' | 'form_submission' | 'ai_context';
  tag?: string; // e.g. "{{customer.name}}"
  tableId?: string;
  fieldKey?: string;
  fallbackValue?: string;
}

export interface LogicCondition {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface StudioLogicRule {
  id: string;
  name?: string;
  matchType: 'all' | 'any';
  conditions: LogicCondition[];
  actions: Array<{
    type: 'show' | 'hide' | 'set_value' | 'require' | 'disable' | 'trigger_action';
    targetNodeId?: string;
    payload?: any;
  }>;
}

export interface StudioActionTrigger {
  type:
    | 'submit_form'
    | 'open_sub_form'
    | 'navigate_page'
    | 'trigger_ai_agent'
    | 'book_calendar'
    | 'stripe_checkout'
    | 'phone_call'
    | 'whatsapp_chat'
    | 'webhook_post'
    | 'open_url';
  targetPageId?: string;
  targetUrl?: string;
  payload?: Record<string, any>;
}

export interface StudioNode {
  id: string;
  name: string;
  nodeType: StudioNodeType;
  widgetType: StudioWidgetType;
  category: StudioWidgetCategory;
  parentId?: string | null;
  children?: StudioNode[];
  
  // Element Properties (Content Tab)
  props: Record<string, any>;
  
  // Visual Styles (Style Tab)
  style: StudioNodeStyle;
  
  // Advanced & Behavior (Advanced Tab)
  advanced?: {
    customId?: string;
    cssClasses?: string;
    isLocked?: boolean;
    isHidden?: boolean;
    isGlobal?: boolean;
    globalSymbolId?: string;
    dataBinding?: DataBindingConfig;
    logicRules?: StudioLogicRule[];
    onClickAction?: StudioActionTrigger;
  };
}
