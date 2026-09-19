/**
 * Fieseros Universal Studio - AI Tree Commands
 * Interprets natural language AI copilot requests into discrete AST mutations
 * on the StudioProject, enabling 1-click conversational editing with full Undo/Redo.
 */

import { StudioProject } from '../schema/project';
import { StudioNode } from '../schema/node';
import { createStudioNode, insertNodeIntoTree, updateNodeInTree } from '../engine/tree-engine';

export interface AICopilotCommandResult {
  updatedProject: StudioProject;
  message: string;
  actionTaken: string;
}

export function executeAICopilotPrompt(
  project: StudioProject,
  prompt: string
): AICopilotCommandResult {
  const normalized = prompt.toLowerCase();
  let updatedProject = JSON.parse(JSON.stringify(project)) as StudioProject;
  const activePage = updatedProject.pages.find((p) => p.id === updatedProject.activePageId) || updatedProject.pages[0];
  let actionTaken = 'Updated page layout';
  let message = 'AI Copilot successfully applied your modifications!';

  // 1. Theme & Color adjustments
  if (normalized.includes('dark') || normalized.includes('dark mode')) {
    updatedProject.globalTheme.themeMode = 'dark';
    updatedProject.globalTheme.backgroundColor = '#0f172a';
    updatedProject.globalTheme.surfaceColor = '#1e293b';
    updatedProject.globalTheme.textColor = '#f8fafc';
    actionTaken = 'Switched to Dark Theme';
    message = 'Applied sleek Dark Theme with slate surfaces and crisp typography.';
  } else if (normalized.includes('emerald') || normalized.includes('green')) {
    updatedProject.globalTheme.primaryColor = '#059669';
    actionTaken = 'Set Primary Color to Emerald';
    message = 'Updated primary branding and buttons to Emerald Green.';
  } else if (normalized.includes('orange') || normalized.includes('sunset')) {
    updatedProject.globalTheme.primaryColor = '#ea580c';
    actionTaken = 'Set Primary Color to Sunset Orange';
    message = 'Updated primary branding and buttons to Sunset Orange.';
  } else if (normalized.includes('blue') || normalized.includes('ocean')) {
    updatedProject.globalTheme.primaryColor = '#0284c7';
    actionTaken = 'Set Primary Color to Ocean Blue';
    message = 'Updated primary branding and buttons to Ocean Blue.';
  }

  // 2. Corner Radii
  if (normalized.includes('pill') || normalized.includes('rounded pill')) {
    updatedProject.globalTheme.borderRadius = '9999px';
    actionTaken = 'Set Pill Corner Style';
    message = 'Configured full pill-shaped buttons and inputs.';
  } else if (normalized.includes('soft') || normalized.includes('rounded')) {
    updatedProject.globalTheme.borderRadius = '16px';
    actionTaken = 'Set Rounded Corner Style';
    message = 'Applied 16px soft rounded corners across all cards and elements.';
  }

  // 3. Adding New Components
  if (normalized.includes('ai') || normalized.includes('concierge') || normalized.includes('chat')) {
    const aiNode = createStudioNode('ai_chat_concierge', {
      props: {
        title: '24/7 AI Service Concierge',
        greeting: 'Hello! I am your 24/7 AI Service Concierge. How can I assist you today?',
      },
    });
    activePage.rootNode = insertNodeIntoTree(activePage.rootNode, activePage.rootNode.id, aiNode);
    actionTaken = 'Added AI Chat Concierge';
    message = 'Embedded 24/7 AI Service Concierge widget into your canvas.';
  } else if (normalized.includes('calendar') || normalized.includes('booking') || normalized.includes('appointment')) {
    const calNode = createStudioNode('booking_calendar', {
      props: { title: 'Select Appointment Date & Arrival Window' },
    });
    activePage.rootNode = insertNodeIntoTree(activePage.rootNode, activePage.rootNode.id, calNode);
    actionTaken = 'Added Booking Calendar';
    message = 'Added live interactive Booking Calendar slot picker.';
  } else if (normalized.includes('quote') || normalized.includes('calculator') || normalized.includes('estimate')) {
    const calcNode = createStudioNode('calculation_field', {
      props: {
        label: 'Estimated Instant Quote',
        formula: '= (sqft * 4.50) + 120',
        currencySymbol: '$',
      },
    });
    activePage.rootNode = insertNodeIntoTree(activePage.rootNode, activePage.rootNode.id, calcNode);
    actionTaken = 'Added Instant Quote Calculator';
    message = 'Configured real-time Cognito mathematical quote calculator.';
  } else if (normalized.includes('phone') || normalized.includes('call')) {
    const phoneNode = createStudioNode('phone_input', {
      props: { label: 'Phone Number', placeholder: '(555) 000-0000', required: true },
    });
    activePage.rootNode = insertNodeIntoTree(activePage.rootNode, activePage.rootNode.id, phoneNode);
    actionTaken = 'Added Phone Input';
    message = 'Added required Phone Number input with SMS dispatch support.';
  } else if (normalized.includes('photo') || normalized.includes('upload')) {
    const fileNode = createStudioNode('file_upload', {
      props: { label: 'Upload Photos of Equipment / Area', maxFiles: 5 },
    });
    activePage.rootNode = insertNodeIntoTree(activePage.rootNode, activePage.rootNode.id, fileNode);
    actionTaken = 'Added Photo Upload';
    message = 'Added drag-and-drop Photo & File Upload dropzone.';
  } else if (normalized.includes('signature') || normalized.includes('sign')) {
    const signNode = createStudioNode('digital_signature', {
      props: { label: 'Customer Authorization Signature', required: true },
    });
    activePage.rootNode = insertNodeIntoTree(activePage.rootNode, activePage.rootNode.id, signNode);
    actionTaken = 'Added Digital Signature';
    message = 'Added touch-friendly digital signature authorization pad.';
  }

  return {
    updatedProject,
    message,
    actionTaken,
  };
}
