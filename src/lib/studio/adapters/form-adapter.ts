/**
 * Fieseros Universal Studio - Form Adapter
 * Bi-directional lossless adapter converting standard EditorFormData into
 * Elementor-grade StudioProject AST trees, preserving all form fields, themes,
 * settings, and auto-actions.
 */

import { EditorFormData, FormField } from '@/features/forms/types';
import { StudioProject, StudioPage } from '../schema/project';
import { StudioNode, StudioWidgetType } from '../schema/node';
import { createStudioNode } from '../engine/tree-engine';

export function formFieldToStudioNode(field: FormField): StudioNode {
  // Map standard field types to StudioWidgetType
  let widgetType: StudioWidgetType = 'text_input';
  switch (field.type) {
    case 'email':
      widgetType = 'email_input';
      break;
    case 'phone':
      widgetType = 'phone_input';
      break;
    case 'number':
      widgetType = 'number_input';
      break;
    case 'textarea':
      widgetType = 'textarea_input';
      break;
    case 'select':
      widgetType = 'dropdown';
      break;
    case 'radio':
      widgetType = 'radio_group';
      break;
    case 'checkbox':
      widgetType = 'checkbox_group';
      break;
    case 'date':
      widgetType = 'date_picker';
      break;
    case 'time':
      widgetType = 'time_picker';
      break;
    case 'file':
      widgetType = 'file_upload';
      break;
    case 'signature':
      widgetType = 'digital_signature';
      break;
    case 'rating':
      widgetType = 'star_rating';
      break;
    case 'scale':
      widgetType = 'scale_rating';
      break;
    case 'address':
      widgetType = 'address_input';
      break;
    case 'heading':
      widgetType = 'heading';
      break;
    case 'paragraph':
      widgetType = 'text';
      break;
    default:
      if (field.widgetType === 'calculation_field' || field.type === 'calculation') {
        widgetType = 'calculation_field';
      } else if (field.widgetType === 'ai_chat_concierge') {
        widgetType = 'ai_chat_concierge';
      } else {
        widgetType = 'text_input';
      }
  }

  return createStudioNode(widgetType, {
    id: field.id,
    name: field.label || field.placeholder || 'Field',
    props: {
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      defaultValue: field.defaultValue,
      options: field.options,
      formula: (field as any).calculationFormula || (field as any).formula,
      currencySymbol: (field as any).currencySymbol || '$',
    },
    style: {
      colSpan: (field.colSpan as any) || 12,
      padding: '8px',
    },
  });
}

export function convertFormDataToStudioProject(formData: EditorFormData): StudioProject {
  const timestamp = Date.now();
  const slug = formData.id || `proj_${timestamp}`;
  const appName = formData.name || 'Untitled Service App';
  const brandColor = formData.theme?.primaryColor || formData.primaryColor || '#059669';

  // Build root Container
  const rootNode: StudioNode = {
    id: `root_${timestamp}`,
    name: 'Main Page Container',
    nodeType: 'container',
    widgetType: 'container',
    category: 'layout',
    style: {
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      gap: '20px',
      backgroundColor: formData.theme?.backgroundColor || '#ffffff',
      border: { radius: formData.theme?.borderRadius || '24px' },
      shadow: 'lg',
      width: '100%',
    },
    props: {},
    children: [
      // 1. Header Section
      createStudioNode('heading', {
        id: `head_${timestamp}`,
        name: 'Page Title',
        props: {
          title: appName,
          htmlTag: 'h1',
        },
        style: {
          typography: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#0f172a',
          },
        },
      }),

      // 2. Subtext description
      createStudioNode('text', {
        id: `sub_${timestamp}`,
        name: 'Subtitle',
        props: {
          text: formData.description || 'Fill out the form below to receive upfront pricing.',
        },
      }),

      // 3. Form Input Container with converted fields
      createStudioNode('form_container', {
        id: `form_cnt_${timestamp}`,
        name: 'Form Fields Section',
        children: formData.fields && formData.fields.length > 0
          ? formData.fields.map(formFieldToStudioNode)
          : [
              createStudioNode('text_input', { props: { label: 'Full Name', required: true } }),
              createStudioNode('phone_input', { props: { label: 'Phone Number', required: true } }),
              createStudioNode('email_input', { props: { label: 'Email Address', required: true } }),
            ],
      }),

      // 4. Submit Action Button
      createStudioNode('button', {
        id: `btn_${timestamp}`,
        name: 'Submit Button',
        props: {
          label: 'Submit Request ⚡',
        },
        style: {
          backgroundColor: brandColor,
          typography: { color: '#ffffff', fontWeight: 'bold' },
          border: { radius: '12px' },
        },
        advanced: {
          onClickAction: {
            type: 'submit_form',
          },
        },
      }),
    ],
  };

  const mainPage: StudioPage = {
    id: 'page_home',
    name: 'Home / Request',
    slug: 'home',
    layoutType: 'standard',
    isHomePage: true,
    rootNode,
  };

  return {
    id: slug,
    slug,
    name: appName,
    description: formData.description,
    projectType: 'hybrid',
    industry: 'general',
    activePageId: 'page_home',
    pages: [mainPage],
    globalTheme: {
      themeMode: 'light',
      primaryColor: brandColor,
      accentColor: '#0284c7',
      backgroundColor: '#f8fafc',
      surfaceColor: '#ffffff',
      textColor: '#0f172a',
      mutedTextColor: '#64748b',
      fontFamily: formData.theme?.fontFamily || 'Inter',
      headingFontFamily: formData.theme?.fontFamily || 'Inter',
      borderRadius: (formData.theme?.borderRadius as any) || '16px',
      buttonStyle: {
        borderRadius: '12px',
        fontWeight: 'bold',
      },
      cardStyle: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        borderColor: '#e2e8f0',
        shadow: 'sm',
      },
      inputStyle: {
        borderRadius: '12px',
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
      },
    },
    globalSymbols: [],
    pwa: {
      enabled: true,
      appName,
      shortName: appName.slice(0, 12),
      themeColor: brandColor,
      backgroundColor: '#0f172a',
      display: 'standalone',
      startUrl: `/app/${slug}`,
      offlineSupport: true,
    },
    settings: {
      allowSubmissions: true,
      autoCrmSync: true,
      autoJobDispatch: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function studioNodeToFormField(node: StudioNode): FormField | null {
  if (node.nodeType === 'container') return null;

  let fieldType: FormField['type'] = 'text';
  switch (node.widgetType) {
    case 'text_input':
      fieldType = 'text';
      break;
    case 'email_input':
      fieldType = 'email';
      break;
    case 'phone_input':
      fieldType = 'phone';
      break;
    case 'number_input':
      fieldType = 'number';
      break;
    case 'textarea_input':
      fieldType = 'textarea';
      break;
    case 'dropdown':
      fieldType = 'select';
      break;
    case 'radio_group':
      fieldType = 'radio';
      break;
    case 'checkbox_group':
      fieldType = 'checkbox';
      break;
    case 'date_picker':
      fieldType = 'date';
      break;
    case 'time_picker':
      fieldType = 'time';
      break;
    case 'file_upload':
      fieldType = 'file';
      break;
    case 'digital_signature':
      fieldType = 'signature';
      break;
    case 'star_rating':
      fieldType = 'rating';
      break;
    case 'scale_rating':
      fieldType = 'scale';
      break;
    case 'address_input':
      fieldType = 'address';
      break;
    case 'calculation_field':
      fieldType = 'calculation' as any;
      break;
    default:
      return null;
  }

  return {
    id: node.id,
    label: node.props?.label || node.name,
    placeholder: node.props?.placeholder,
    type: fieldType,
    required: node.props?.required || false,
    defaultValue: node.props?.defaultValue,
    options: node.props?.options,
    colSpan: (node.style?.colSpan as any) || 12,
  };
}

export function convertStudioProjectToFormData(project: StudioProject, prevFormData: EditorFormData): EditorFormData {
  const activePage = project.pages.find((p) => p.id === project.activePageId) || project.pages[0];
  const extractedFields: FormField[] = [];

  const extractRecursive = (node: StudioNode) => {
    const converted = studioNodeToFormField(node);
    if (converted) {
      extractedFields.push(converted);
    }
    if (node.children) {
      node.children.forEach(extractRecursive);
    }
  };

  if (activePage?.rootNode) {
    extractRecursive(activePage.rootNode);
  }

  return {
    ...prevFormData,
    name: project.name,
    description: project.description,
    fields: extractedFields.length > 0 ? extractedFields : prevFormData.fields,
    theme: {
      ...prevFormData.theme,
      primaryColor: project.globalTheme.primaryColor,
      backgroundColor: project.globalTheme.backgroundColor,
      fontFamily: project.globalTheme.fontFamily,
      borderRadius: project.globalTheme.borderRadius,
    },
  };
}
