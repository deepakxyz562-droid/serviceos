'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Mic,
  FileText,
  History,
  Send,
  Paperclip,
  X,
  Bot,
  Sparkles,
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  User,
  RotateCcw,
  Sliders,
  ChevronDown,
  MonitorPlay,
  Brain,
  Presentation,
  MessageCircle,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FormAgentData, ConnectedFormRef } from '@/features/forms/types/agent-types';
import { resolveAgentTheme } from '@/lib/theme/agent-theme';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentDeviceSimulatorProps {
  agent: FormAgentData;
  isTestMode?: boolean;
  previewPage?: 'conversation' | 'greeting';
  onOpenFormInModal?: (form: ConnectedFormRef) => void;
  onRestartSession?: () => void;
  onToggleTestMode?: () => void;
  onSwitchPage?: (page: 'conversation' | 'greeting') => void;
}

interface ChatMsg {
  id: string;
  sender: 'ai' | 'user' | 'agent';
  text: string;
  timestamp: string;
  imageUrl?: string;
  suggestedForm?: ConnectedFormRef;
  senderName?: string;
  isLiveAgent?: boolean;
  card?: any;
}

function isColorDark(colorStr?: string): boolean {
  if (!colorStr) return false;
  const hex = colorStr.replace('#', '').trim();
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 145;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 145;
  }
  return false;
}

// ─── Rich Chat Markdown Formatting (Jotform Parity) ─────────────────────────

export function renderInlineMarkdown(text: string, isDark: boolean, isUser: boolean): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    const token = m[0];
    if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const labelMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (labelMatch) {
        const [, label, url] = labelMatch;
        nodes.push(
          <a
            key={key++}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'underline font-medium hover:opacity-80 transition-opacity inline-flex items-center gap-0.5',
              isUser
                ? 'text-white underline decoration-white/60'
                : isDark
                ? 'text-blue-400 decoration-blue-400/60'
                : 'text-blue-600 decoration-blue-600/60'
            )}
          >
            {label}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong
          key={key++}
          className={cn(
            'font-bold',
            isUser ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'
          )}
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key++}
          className={cn(
            'rounded px-1.5 py-0.5 text-[0.9em] font-mono font-medium',
            isUser
              ? 'bg-white/20 text-white'
              : isDark
              ? 'bg-slate-700/80 text-blue-300 border border-slate-600'
              : 'bg-slate-200/80 text-blue-700 border border-slate-300'
          )}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes;
}

export function renderChatContent(text: string, isDark: boolean, isUser = false) {
  if (!text) return null;
  const blocks: React.ReactNode[] = [];
  const lines = text.split('\n');
  let bullets: string[] = [];
  let isNumbered = false;
  let key = 0;
  let i = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    if (isNumbered) {
      blocks.push(
        <ol key={key++} className="my-1.5 space-y-1 list-decimal list-inside pl-1 text-xs">
          {bullets.map((b, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(b, isDark, isUser)}
            </li>
          ))}
        </ol>
      );
    } else {
      blocks.push(
        <ul key={key++} className="my-1.5 space-y-1 pl-1 text-xs">
          {bullets.map((b, idx) => (
            <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
              <span
                className={cn(
                  'mt-1.5 size-1.5 shrink-0 rounded-full',
                  isUser ? 'bg-white/80' : isDark ? 'bg-blue-400' : 'bg-blue-600'
                )}
              />
              <span className="flex-1">{renderInlineMarkdown(b, isDark, isUser)}</span>
            </li>
          ))}
        </ul>
      );
    }
    bullets = [];
    isNumbered = false;
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Check for fenced code block ```
    if (line.startsWith('```')) {
      flushBullets();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimEnd().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <pre
          key={key++}
          className={cn(
            'my-1.5 p-2 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed',
            isUser
              ? 'bg-black/25 text-white'
              : isDark
              ? 'bg-slate-900 border border-slate-700 text-slate-200'
              : 'bg-slate-200/90 border border-slate-300 text-slate-800'
          )}
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Check for Blockquotes (> quote)
    if (line.startsWith('> ')) {
      flushBullets();
      blocks.push(
        <div
          key={key++}
          className={cn(
            'my-1.5 rounded-r-lg border-l-2 px-2.5 py-1 text-xs italic leading-relaxed',
            isUser
              ? 'border-white bg-white/10 text-white'
              : isDark
              ? 'border-blue-400 bg-blue-500/10 text-slate-200'
              : 'border-blue-600 bg-blue-50 text-slate-800'
          )}
        >
          {renderInlineMarkdown(line.slice(2), isDark, isUser)}
        </div>
      );
      i++;
      continue;
    }

    // Check for Headings (#, ##, ###)
    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      flushBullets();
      const headingText = line.replace(/^#+\s*/, '');
      blocks.push(
        <div
          key={key++}
          className={cn(
            'mt-2 mb-1 font-bold text-xs',
            isUser ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'
          )}
        >
          {renderInlineMarkdown(headingText, isDark, isUser)}
        </div>
      );
      i++;
      continue;
    }

    // Check for Bullet list (- item, * item, • item)
    const bulletMatch = line.match(/^\s*[-•*]\s+(.*)$/);
    if (bulletMatch) {
      if (isNumbered && bullets.length > 0) flushBullets();
      isNumbered = false;
      bullets.push(bulletMatch[1]);
      i++;
      continue;
    }

    // Check for Numbered list (1. item, 1) item)
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numberedMatch) {
      if (!isNumbered && bullets.length > 0) flushBullets();
      isNumbered = true;
      bullets.push(numberedMatch[1]);
      i++;
      continue;
    }

    flushBullets();
    if (line.trim() === '') {
      blocks.push(<div key={key++} className="h-1" />);
    } else {
      blocks.push(
        <div key={key++} className="leading-relaxed">
          {renderInlineMarkdown(line, isDark, isUser)}
        </div>
      );
    }
    i++;
  }
  flushBullets();

  return <div className="space-y-1">{blocks}</div>;
}

export function AgentDeviceSimulator({
  agent,
  isTestMode = true,
  previewPage = 'conversation',
  onOpenFormInModal,
  onRestartSession,
  onToggleTestMode,
  onSwitchPage,
}: AgentDeviceSimulatorProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'forms' | 'history' | 'presentation' | 'whatsapp'>('chat');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [screenSharingActive, setScreenSharingActive] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activeFormModal, setActiveFormModal] = useState<ConnectedFormRef | null>(null);
  const [escalatedToHuman, setEscalatedToHuman] = useState<boolean>(false);
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [agentAvailable, setAgentAvailable] = useState<boolean | null>(null);
  const [operatorConnected, setOperatorConnected] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [agentSpeaking, setAgentSpeaking] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedImage, setAttachedImage] = useState<{ name: string; url: string } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAttachedImage({ name: file.name, url: dataUrl });
      toast.success(`Attached photo: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Text-to-speech engine matching agent voice tone
  const speakAiResponse = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted) return;

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#`~]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = agent.voiceTone === 'energetic' ? 1.1 : agent.voiceTone === 'calm' ? 0.95 : 1.0;
    utterance.pitch = agent.voiceTone === 'friendly' ? 1.05 : 1.0;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) =>
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Karen') || v.name.includes('Alex'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (englishVoice) utterance.voice = englishVoice;

    utterance.onstart = () => setAgentSpeaking(true);
    utterance.onend = () => {
      setAgentSpeaking(false);
      if (isCalling && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    };
    utterance.onerror = () => setAgentSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [agent.voiceTone, isCalling, isMuted]);

  // Two-way interactive voice call toggle
  const toggleVoiceCall = () => {
    if (isCalling) {
      setIsCalling(false);
      setAgentSpeaking(false);
      setVoiceTranscript('');
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      toast.info('Voice session ended');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsCalling(true);
        toast.success(`Connected with ${agent.name}. Start speaking!`);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setVoiceTranscript(transcript);
            handleSendMessage(transcript);
            try { recognition.stop(); } catch {}
            return;
          } else {
            currentTranscript += transcript;
          }
        }
        setVoiceTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('[SpeechRecognition] error:', event.error);
        }
      };

      recognition.onend = () => {
        if (isCalling && !agentSpeaking) {
          try { recognition.start(); } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[SpeechRecognition] start error:', err);
      toast.error('Could not access microphone. Please grant microphone permission.');
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize greeting on load
  useEffect(() => {
    setMessages([
      {
        id: 'msg_greet',
        sender: 'ai',
        text: agent.welcomeGreeting || `Hi! 👋 I'm **${agent.name}**, your **${agent.roleTitle || '24/7 AI Service Specialist'}**. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [agent.welcomeGreeting, agent.name, agent.roleTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab, sending]);

  // ── Poll for live specialist responses when session escalated ─────────────
  useEffect(() => {
    if (!liveSessionId) return;

    let isMounted = true;
    const pollMessages = async () => {
      try {
        const res = await fetch(`/api/public/chat/${encodeURIComponent(liveSessionId)}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data.messages || !Array.isArray(data.messages)) return;

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newBackendMsgs: ChatMsg[] = [];
          let hasAdmin = false;
          let latestAdminName = '';

          for (const m of data.messages) {
            if (m.senderType === 'admin') {
              hasAdmin = true;
              if (m.senderName) latestAdminName = m.senderName;
            }
            if (!existingIds.has(m.id) && (m.senderType === 'admin' || m.senderType === 'system')) {
              newBackendMsgs.push({
                id: m.id,
                sender: m.senderType === 'admin' ? 'agent' : 'ai',
                senderName: m.senderName || 'Live Specialist',
                isLiveAgent: m.senderType === 'admin',
                text: m.body,
                timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }
          }

          if (hasAdmin) {
            setOperatorConnected(true);
            if (latestAdminName) setOperatorName(latestAdminName);
          }

          if (newBackendMsgs.length === 0) return prev;
          return [...prev, ...newBackendMsgs];
        });
      } catch (err) {
        console.warn('[live-chat poll] error:', err);
      }
    };

    const timer = setInterval(pollMessages, 3000);
    pollMessages();
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [liveSessionId]);

  const handleSendMessage = async (textToSend?: string) => {
    const currentAttachment = attachedImage;
    const message = (textToSend || inputText).trim();
    if ((!message && !currentAttachment) || sending) return;

    setAttachedImage(null);

    const userMsg: ChatMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: message || (currentAttachment ? `[Uploaded photo: ${currentAttachment.name}]` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: currentAttachment?.url,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSending(true);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    // If escalated to a human operator:
    if (escalatedToHuman) {
      const lower = (message || '').toLowerCase();
      const wantsAiOrBooking =
        lower.includes('appointment') ||
        lower.includes('book') ||
        lower.includes('schedule') ||
        lower.includes('tomorrow') ||
        lower.includes('today') ||
        lower.includes('service') ||
        lower.includes('price') ||
        lower.includes('rate') ||
        lower.includes('cost') ||
        lower.includes('ai') ||
        lower.includes('robot') ||
        lower.includes('bot') ||
        lower.includes('resume') ||
        lower.includes('back') ||
        lower.includes('not available') ||
        lower.includes('not replying') ||
        lower.includes('anyone there');

      if (wantsAiOrBooking || !liveSessionId) {
        // Automatically un-mute AI so user can book or get answers
        setEscalatedToHuman(false);
      } else {
        try {
          await fetch(`/api/public/chat/${encodeURIComponent(liveSessionId)}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              body: currentAttachment ? `${message} [Photo attached: ${currentAttachment.name}]` : message,
              visitorName: 'Visitor',
            }),
          });
        } catch (err) {
          console.warn('[live-chat send] error:', err);
        } finally {
          setSending(false);
        }
        return;
      }
    }

    try {
      const targetAgentId = agent.id || 'preview';
      const res = await fetch(`/api/forms/agents/${encodeURIComponent(targetAgentId)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentAttachment ? `${message} [Customer Attached Photo: ${currentAttachment.name}]` : message,
          imageUrl: currentAttachment?.url,
          sessionId: aiSessionId || undefined,
          history: messages,
          agentConfig: agent,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (data.sessionId && !aiSessionId) {
        setAiSessionId(data.sessionId);
      }

      if (data.escalatedToHuman) {
        setEscalatedToHuman(true);
        if (data.sessionId) setLiveSessionId(data.sessionId);
        if (data.agentAvailable !== undefined) setAgentAvailable(data.agentAvailable);
      }

      if (res.ok && data.reply) {
        const matchedForm = data.suggestedFormId
          ? agent.connectedForms?.find((f) => f.id === data.suggestedFormId) || agent.connectedForms?.[0]
          : undefined;

        const aiMsg: ChatMsg = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedForm: matchedForm,
          card: data.card,
        };

        setMessages((prev) => [...prev, aiMsg]);
        if (isCalling) {
          speakAiResponse(data.reply);
        }
        return;
      }

      // If live API returned non-OK status or in test mode without live keys, provide contextual fallback
      const matchedForm = data.suggestedFormId
        ? agent.connectedForms?.find((f) => f.id === data.suggestedFormId)
        : undefined;
      const aiMsg: ChatMsg = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: data.reply || `Thank you for reaching out! As ${agent.name || 'your AI Assistant'} (${agent.roleTitle || 'Customer Concierge'}), I'm ready to help. Feel free to ask about our services, rates, or schedule an appointment!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedForm: matchedForm,
        card: data.card,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (isCalling) {
        speakAiResponse(aiMsg.text);
      }
    } catch {
      const fallbackText = `I'm happy to help you with your inquiry! You can ask questions or complete ${agent.connectedForms?.[0]?.name || 'our form'} to proceed.`;
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_fallback_${Date.now()}`,
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedForm: agent.connectedForms?.[0],
        },
      ]);
      if (isCalling) {
        speakAiResponse(fallbackText);
      }
    } finally {
      setSending(false);
    }
  };

  const handleQuickActionClick = (action: any) => {
    if (onSwitchPage && previewPage === 'greeting') {
      onSwitchPage('conversation');
    }
    if (action.actionType === 'open_form') {
      const form = agent.connectedForms?.find((f) => f.id === action.targetFormId || f.id === action.payload) || agent.connectedForms?.[0];
      if (form) {
        setActiveFormModal(form);
        onOpenFormInModal?.(form);
        setActiveTab('forms');
      } else {
        handleSendMessage(action.label);
      }
    } else {
      handleSendMessage(action.payload || action.label);
    }
  };

  const resetChat = () => {
    setEscalatedToHuman(false);
    setLiveSessionId(null);
    setAiSessionId(null);
    setAgentAvailable(null);
    setOperatorConnected(false);
    setOperatorName(null);
    setMessages([
      {
        id: 'msg_greet',
        sender: 'ai',
        text: agent.welcomeGreeting || `Hi! I'm **${agent.name}**, your **AI Agent** and **${agent.roleTitle}**. How can I help you?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    toast.success('Conversation reset');
    onRestartSession?.();
  };

  const theme = resolveAgentTheme(agent);
  const brandColor = theme.primaryColor;
  const chatBg = theme.chatBg;
  const isDark = theme.isDark;
  const titleColor = theme.titleColor;
  const headerGradient = theme.headerGradient;
  const isHeaderDark = theme.isHeaderDark;
  const isSidebarLayout = agent.channels?.chatbot?.layoutMode === 'sidebar';
  const allowFileUpload = agent.settings?.fileUploadEnabled ?? true;
  const allowScreenShare = agent.settings?.allowScreenSharing ?? false;
  const memoryActive = agent.settings?.memoryEnabled ?? true;
  const welcomeStyle = agent.channels?.chatbot?.welcomeStyle || 'quick_input';
  const greetingToggle = agent.channels?.chatbot?.greetingToggle ?? true;
  const placeholderMessage = agent.channels?.chatbot?.placeholderMessage || 'Ask AI';
  const greetingBubble = agent.channels?.chatbot?.greetingBubble || `👋 Need help? Chat with ${agent.name}!`;

  // Compute active navigation items
  const navItems = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare, enabled: agent.navigation?.chatEnabled ?? true },
    { id: 'voice' as const, label: 'Voice', icon: Mic, enabled: agent.navigation?.voiceEnabled ?? true },
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle, enabled: agent.navigation?.whatsappEnabled ?? false },
    { id: 'forms' as const, label: 'Forms', icon: FileText, enabled: agent.navigation?.formsEnabled ?? true },
    { id: 'presentation' as const, label: 'Presentation', icon: Presentation, enabled: agent.navigation?.presentationEnabled ?? false },
    { id: 'history' as const, label: 'History', icon: History, enabled: agent.navigation?.historyEnabled ?? true },
  ].filter((item) => item.enabled);

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 1: GREETING / WELCOME PAGE (Screenshots 4 & Minimized Launcher)
  // ═════════════════════════════════════════════════════════════════════════
  if (previewPage === 'greeting') {
    return (
      <div className={cn('flex flex-col justify-end h-full w-full p-4 items-center sm:items-end', isDark && 'dark')}>
        {welcomeStyle === 'avatar' ? (
          /* ── AVATAR CIRCLE LAUNCHER STYLE ── */
          <div className="flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {greetingToggle && (
              <div
                onClick={() => onSwitchPage?.('conversation')}
                className={cn(
                  'px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-semibold cursor-pointer max-w-[260px] leading-snug hover:scale-105 transition-transform',
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/50'
                    : 'bg-white border-slate-200 text-slate-800'
                )}
              >
                {greetingBubble}
              </div>
            )}
            <button
              type="button"
              onClick={() => onSwitchPage?.('conversation')}
              className="relative size-16 rounded-full shadow-2xl p-0.5 border-2 border-white hover:scale-110 transition-transform cursor-pointer"
              style={{ background: brandColor }}
            >
              <img
                src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                alt={agent.name}
                className="size-full rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 size-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
            </button>
          </div>
        ) : (
          /* ── QUICK INPUT CARD LAUNCHER STYLE ── */
          <div
            className={cn(
              'w-full max-w-[340px] rounded-3xl p-5 shadow-2xl border space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300',
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/50'
                : 'bg-white border-slate-200/80 text-slate-900'
            )}
          >
            {greetingToggle && (
              <p className={cn('text-xs leading-relaxed font-medium', isDark ? 'text-slate-100' : 'text-slate-800')}>
                Hi! I&apos;m <strong className="font-bold text-blue-500">{agent.name}</strong>, your <strong className="font-bold">AI Agent</strong> and <strong className="font-bold">{agent.roleTitle}</strong>. How can I help you?
              </p>
            )}

            {/* Connected Form Launcher Card */}
            {agent.connectedForms && agent.connectedForms.length > 0 && (
              <div
                onClick={() => {
                  const form = agent.connectedForms![0];
                  setActiveFormModal(form);
                  onOpenFormInModal?.(form);
                }}
                className={cn(
                  'p-3 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all shadow-2xs group hover:scale-[1.01]',
                  isDark
                    ? 'bg-blue-950/40 border-blue-600/50 hover:border-blue-400'
                    : 'bg-blue-50/70 border-blue-200 hover:border-blue-400'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-xl bg-blue-600/20 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className={cn("text-xs font-bold truncate", isDark ? "text-blue-200" : "text-blue-950")}>
                      {agent.connectedForms[0].name || (agent.connectedForms[0] as any).title}
                    </p>
                    <p className={cn("text-[10px] truncate", isDark ? "text-blue-400" : "text-blue-600")}>
                      {agent.connectedForms[0].description || 'Click to fill out and submit'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-600 text-white group-hover:bg-blue-500 transition-colors">
                  Open
                </div>
              </div>
            )}

            {(agent.channels?.chatbot?.showButtons ?? true) && (agent.quickActions || []).length > 0 && (
              <div className="space-y-2">
                {(agent.quickActions || []).slice(0, 3).map((qa) => (
                  <button
                    key={qa.id}
                    type="button"
                    onClick={() => handleQuickActionClick(qa)}
                    className={cn(
                      'w-full py-2 px-4 rounded-xl border text-xs font-semibold text-center transition-all shadow-2xs',
                      isDark
                        ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-100 hover:border-slate-500'
                        : 'bg-slate-50/50 hover:bg-blue-50/50 border-slate-300 hover:border-blue-500 text-slate-800'
                    )}
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            )}

            <div className={cn('flex items-center gap-2 pt-1 border-t', isDark ? 'border-slate-800' : 'border-slate-100')}>
              <div
                onClick={() => onSwitchPage?.('conversation')}
                className={cn(
                  'flex items-center gap-2 flex-1 rounded-full px-3 py-1.5 cursor-pointer transition-all border',
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
                )}
              >
                <img
                  src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                  alt={agent.name}
                  className="size-5 rounded-full object-cover shrink-0"
                />
                <span className={cn('text-xs font-medium', isDark ? 'text-slate-300' : 'text-slate-500')}>
                  {placeholderMessage}
                </span>
              </div>

              {(agent.navigation?.voiceEnabled ?? true) && (
                <button
                  type="button"
                  onClick={() => {
                    onSwitchPage?.('conversation');
                    setActiveTab('voice');
                  }}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md transition-all shrink-0',
                    isDark
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  )}
                >
                  <Mic className="size-3.5" />
                  <span>Voice</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 2: CONVERSATION PAGE (Full Interactive Simulation)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div
      className={cn(
        'flex flex-col h-full w-full overflow-hidden shadow-2xl border transition-all select-none relative',
        isDark ? 'dark border-slate-800 text-slate-100' : 'border-slate-200/80 text-slate-900',
        isSidebarLayout ? 'rounded-none border-y-0 h-full' : 'rounded-[28px]'
      )}
      style={{
        backgroundColor: chatBg,
      }}
    >
      {/* ── FIXED / PINNED TOP AGENT HEADER ── */}
      <header className="sticky top-0 z-30 shrink-0 w-full shadow-xs">
        {/* ── TOP AGENT BAR ── */}
        <div
          className={cn(
            "px-4 py-3 flex items-center justify-between transition-all",
            isHeaderDark ? "text-white" : "text-slate-900"
          )}
          style={{
            background: headerGradient,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                alt={agent.name}
                className="size-9 rounded-full object-cover border-2 border-white/80 shadow-xs"
              />
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold leading-none tracking-tight" style={{ color: titleColor }}>
                  {agent.name}
                </h2>
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none", isHeaderDark ? "bg-white/20 text-white" : "bg-black/10 text-slate-900")}>
                  AI
                </span>
                {memoryActive && (
                  <span className={cn("text-[8px] font-semibold px-1 rounded flex items-center gap-0.5", isHeaderDark ? "bg-black/20 text-white/90" : "bg-white/60 text-slate-800")} title="Agent remembers context">
                    <Brain className="size-2.5" /> Memory
                  </span>
                )}
              </div>
              <p className={cn("text-[10px] mt-0.5 leading-none", isHeaderDark ? "text-white/85" : "text-slate-700")}>{agent.roleTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {((agent.navigation?.formsEnabled ?? true) && (agent.connectedForms?.length ?? 0) > 0) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setActiveTab('forms')}
                title="Connected Forms"
                className={cn("size-7 rounded-full relative", isHeaderDark ? "text-white/80 hover:text-white hover:bg-white/10" : "text-slate-700 hover:text-slate-900 hover:bg-black/10")}
              >
                <FileText className="size-3.5" />
                <span className="absolute -top-0.5 -right-0.5 size-3.5 bg-blue-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {agent.connectedForms?.length}
                </span>
              </Button>
            )}

            {allowScreenShare && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setScreenSharingActive(!screenSharingActive);
                  toast(screenSharingActive ? 'Screen sharing stopped' : 'Screen sharing active for visual guidance');
                }}
                title="Screen Sharing Visual Guidance"
                className={cn(
                  'size-7 rounded-full text-white/80 hover:text-white',
                  screenSharingActive ? 'bg-emerald-500 text-white' : 'hover:bg-white/10'
                )}
              >
                <MonitorPlay className="size-3.5" />
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetChat}
              title="Restart Session"
              className="size-7 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="size-3.5" />
            </Button>

            {onSwitchPage && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onSwitchPage('greeting')}
                title="Minimize Chat"
                className="size-7 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <ChevronDown className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ── HUMAN OPERATOR ESCALATION ALERT BANNER ── */}
        {escalatedToHuman && (
          <div
            className={cn(
              'px-3.5 py-2.5 flex items-center justify-between gap-2 text-[11px] font-medium animate-in fade-in shrink-0 border-b',
              operatorConnected
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : agentAvailable === false
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300'
                : 'bg-blue-500/15 border-blue-500/30 text-blue-800 dark:text-blue-300'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  'size-2 rounded-full shrink-0',
                  operatorConnected
                    ? 'bg-emerald-500'
                    : agentAvailable === false
                    ? 'bg-amber-500'
                    : 'bg-blue-500 animate-ping'
                )}
              />
              <span className="truncate">
                {operatorConnected
                  ? `Live Specialist ${operatorName ? `(${operatorName})` : ''} connected! You are chatting live.`
                  : agentAvailable === false
                  ? 'Specialists offline right now (Mon–Fri 8am–6pm). Leave a message or book below.'
                  : 'Connecting with a live specialist... An operator has been notified.'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setEscalatedToHuman(false)}
                className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Switch back to automated AI Assistant"
              >
                <Bot className="size-3 text-emerald-400" />
                Resume AI
              </button>
              {agentAvailable === false && (
                <button
                  type="button"
                  onClick={() => {
                    const matchedForm = agent.connectedForms?.[0];
                    if (matchedForm) {
                      setActiveFormModal(matchedForm);
                      onOpenFormInModal?.(matchedForm);
                    }
                  }}
                  className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Calendar className="size-3" />
                  Book on Calendar
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── TAB 1: CHAT TAB CONTENT ── */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 relative flex flex-col p-4 space-y-4">
            {/* Messages Stream */}
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              const isLiveSpecialist = msg.sender === 'agent' || msg.isLiveAgent;
              const isAi = !isUser && !isLiveSpecialist;
              return (
                <div
                  key={msg.id || index}
                  className={cn(
                    'flex items-start gap-2 max-w-[88%] animate-in fade-in slide-in-from-bottom-2 duration-200',
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  )}
                >
                  {isLiveSpecialist ? (
                    <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs ring-1 ring-emerald-400">
                      <User className="size-3.5" />
                    </div>
                  ) : isAi ? (
                    <img
                      src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                      alt={agent.name}
                      className="size-6 rounded-full object-cover shrink-0 mt-0.5"
                    />
                  ) : null}

                  <div className="space-y-1.5 flex-1 min-w-0">
                    {isLiveSpecialist && (
                      <div className="flex items-center gap-1.5 px-0.5">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {msg.senderName || 'Live Specialist'}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold">
                          Human Operator
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'p-3 rounded-2xl text-xs leading-relaxed shadow-2xs break-words font-medium',
                        isLiveSpecialist
                          ? isDark
                            ? 'bg-emerald-950/40 border border-emerald-600/40 text-emerald-100 rounded-tl-xs shadow-emerald-950/30'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-tl-xs'
                          : isAi
                          ? isDark
                            ? 'bg-slate-800/95 border border-slate-700/80 text-slate-100 rounded-tl-xs shadow-slate-950/40'
                            : 'bg-slate-100 border border-slate-200/60 text-slate-900 rounded-tl-xs'
                          : 'text-white rounded-tr-xs shadow-sm'
                      )}
                      style={isUser ? { background: brandColor } : undefined}
                    >
                      {renderChatContent(msg.text, isDark, isUser)}
                      {msg.imageUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-white/20 max-w-[260px] bg-black/10">
                          <img
                            src={msg.imageUrl}
                            alt="Customer uploaded photo"
                            className="w-full h-auto object-cover max-h-52 rounded-lg"
                          />
                        </div>
                      )}
                    </div>

                    {/* Quick action buttons on initial greeting message */}
                    {index === 0 && isAi && (agent.channels?.chatbot?.showButtons ?? true) && (() => {
                      const existingActions = agent.quickActions || [];
                      const hasFormAction = existingActions.some(
                        (qa) => qa.actionType === 'open_form' || qa.label.toLowerCase().includes('form') || qa.label.toLowerCase().includes('estimate')
                      );
                      const displayActions = [...existingActions];

                      // If connected form exists and no form action is present, add a single primary action
                      if (!hasFormAction && agent.connectedForms && agent.connectedForms.length > 0) {
                        const cleanName = agent.connectedForms[0].name.replace(/\s+(Intake|Quote|Form|Application)(\s+Form)?/gi, '').trim() || 'Service';
                        displayActions.unshift({
                          id: 'qa_auto_form',
                          label: `Fill ${cleanName} Form`,
                          actionType: 'open_form' as const,
                          payload: agent.connectedForms[0].id,
                        });
                      }

                      // Deduplicate by normalized label
                      const seen = new Set<string>();
                      const uniqueActions = displayActions.filter((qa) => {
                        const key = (qa.label || '').trim().toLowerCase();
                        if (!key || seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      });

                      if (uniqueActions.length === 0) return null;

                      return (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {uniqueActions.map((qa) => {
                            const isFormBtn = qa.actionType === 'open_form';
                            return (
                              <button
                                key={qa.id}
                                type="button"
                                onClick={() => handleQuickActionClick(qa)}
                                className={cn(
                                  'py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 text-left',
                                  isFormBtn
                                    ? isDark
                                      ? 'bg-blue-950/70 border-blue-600/70 text-blue-200 hover:bg-blue-900/80 hover:border-blue-400'
                                      : 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100 hover:border-blue-400'
                                    : isDark
                                      ? 'bg-slate-800/90 border-slate-700 text-slate-100 hover:bg-slate-700 hover:border-slate-500'
                                      : 'bg-white border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-400'
                                )}
                              >
                                {isFormBtn && <FileText className="size-3 text-blue-500" />}
                                <span>{qa.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Card Protocol Rendering */}
                    {msg.card?.type === 'slot_picker' && (
                      <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/30 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="size-3 text-blue-500" />
                          Select Booking Slot:
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {msg.card.slots?.map((slot: string, sIdx: number) => (
                            <Button
                              key={sIdx}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendMessage(`I would like to book the ${slot} slot.`)}
                              className="text-[11px] h-7 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 border-blue-300 dark:border-blue-800"
                            >
                              {slot}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Booking Confirmation Card */}
                    {msg.card?.type === 'booking_confirmation' && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                          <span>Appointment Confirmed!</span>
                        </div>
                        <div className="text-[11px] text-emerald-900 dark:text-emerald-100 space-y-0.5">
                          <p><strong>Date:</strong> {msg.card.date} at {msg.card.time}</p>
                          {msg.card.service && <p><strong>Service:</strong> {msg.card.service}</p>}
                          {msg.card.name && <p><strong>Name:</strong> {msg.card.name}</p>}
                        </div>
                        {msg.card.meetingUrl && (
                          <a
                            href={msg.card.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                          >
                            <Video className="size-3.5" />
                            <span>Join Google Meet</span>
                          </a>
                        )}
                        {msg.card.calendarUrls && (
                          <div className="flex gap-2 pt-1">
                            <a
                              href={msg.card.calendarUrls.google}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center py-1.5 px-2 text-[10px] font-bold rounded-lg bg-white dark:bg-slate-900 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 shadow-2xs transition-colors"
                            >
                              Google Calendar
                            </a>
                            <a
                              href={msg.card.calendarUrls.outlook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center py-1.5 px-2 text-[10px] font-bold rounded-lg bg-white dark:bg-slate-900 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 shadow-2xs transition-colors"
                            >
                              Outlook
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Connected Form Recommendation Card */}
                    {msg.suggestedForm && (
                      <div
                        className={cn(
                          'p-3 rounded-xl border space-y-2',
                          isDark
                            ? 'bg-slate-800/90 border-slate-700'
                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/80'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-blue-400" />
                          <span className={cn('text-[11px] font-bold', isDark ? 'text-blue-300' : 'text-blue-900')}>
                            {msg.suggestedForm.name}
                          </span>
                        </div>
                        <p className={cn('text-[10px]', isDark ? 'text-slate-300' : 'text-slate-600')}>
                          {msg.suggestedForm.description || 'Complete this form to submit your inquiry.'}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setActiveFormModal(msg.suggestedForm!);
                            onOpenFormInModal?.(msg.suggestedForm!);
                          }}
                          className="w-full h-7 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-xs"
                        >
                          Open &amp; Fill Form <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    )}

                    <span className={cn('text-[9px] block px-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-2 mr-auto animate-in fade-in duration-200">
                <img
                  src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                  alt={agent.name}
                  className="size-6 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className={cn(
                  'p-3 rounded-2xl rounded-tl-xs text-xs flex items-center gap-1.5 shadow-2xs',
                  isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-800 border border-slate-200/60'
                )}>
                  <span className="size-1.5 rounded-full bg-blue-500 animate-bounce" />
                  <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="size-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── BOTTOM INPUT BAR ── */}
          <div
            className={cn(
              'p-2.5 border-t shrink-0 sticky bottom-0 z-20 space-y-2',
              isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            )}
          >
            {/* Attached Image Preview Chip */}
            {attachedImage && (
              <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs animate-in fade-in">
                <div className="flex items-center gap-2 truncate">
                  <img src={attachedImage.url} alt="Attached thumbnail" className="size-6 rounded-md object-cover border border-emerald-500/40" />
                  <span className="truncate text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] max-w-[200px]">
                    {attachedImage.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="size-5 rounded-full hover:bg-emerald-500/20 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            <div
              className={cn(
                'flex items-center gap-2 rounded-2xl px-3 py-1.5 border',
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100/90 border-slate-200'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach photo of leak, damage or problem area"
                className={cn(
                  'p-1 rounded-lg transition-colors cursor-pointer',
                  attachedImage
                    ? 'text-emerald-600 bg-emerald-500/20'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'
                )}
              >
                <Paperclip className="size-4" />
              </button>

              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSendMessage())}
                placeholder={attachedImage ? 'Add a note about this photo...' : placeholderMessage}
                className={cn(
                  'text-xs h-7 flex-1 bg-transparent border-0 focus-visible:ring-0 shadow-none px-1',
                  isDark ? 'text-slate-100 placeholder:text-slate-400' : 'text-slate-900 placeholder:text-slate-500'
                )}
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                style={{ background: brandColor }}
                className="size-7 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs hover:opacity-90 transition-opacity"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── TAB 2: VOICE TAB CONTENT ── */}
      {activeTab === 'voice' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 text-center">
          <div className="relative">
            <img
              src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
              alt={agent.name}
              className={cn(
                'size-24 rounded-full object-cover border-4 transition-all duration-300',
                agentSpeaking
                  ? 'border-emerald-500 ring-8 ring-emerald-500/20 shadow-2xl scale-105'
                  : isCalling
                  ? 'border-blue-500 ring-8 ring-blue-500/20 shadow-2xl'
                  : 'border-white dark:border-slate-800 shadow-xl'
              )}
            />
            {(isCalling || agentSpeaking) && (
              <div
                className={cn(
                  'absolute inset-0 rounded-full border-4 animate-ping opacity-25',
                  agentSpeaking ? 'border-emerald-500' : 'border-blue-500'
                )}
              />
            )}
          </div>

          <div className="space-y-1">
            <h3 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>{agent.name}</h3>
            <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
              {agentSpeaking
                ? 'Speaking...'
                : isCalling
                ? 'Listening... Speak into microphone'
                : `Voice Assistant • ${agent.voiceTone || 'professional'} tone`}
            </p>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center gap-1.5 h-10">
            {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 35, 65].map((h, i) => (
              <span
                key={i}
                className={cn(
                  'w-1 rounded-full transition-all',
                  agentSpeaking
                    ? 'bg-emerald-500 animate-pulse'
                    : isCalling
                    ? 'bg-blue-500 animate-pulse'
                    : isDark
                    ? 'bg-slate-700'
                    : 'bg-slate-300'
                )}
                style={{
                  height: isCalling || agentSpeaking ? `${h}%` : '20%',
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Live speech transcript preview */}
          {voiceTranscript && (
            <div
              className={cn(
                'max-w-xs px-3 py-2 rounded-xl text-xs italic leading-relaxed border animate-in fade-in',
                isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              )}
            >
              &ldquo;{voiceTranscript}&rdquo;
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button
              type="button"
              size="icon"
              variant={isMuted ? 'destructive' : 'outline'}
              onClick={() => setIsMuted(!isMuted)}
              className={cn('size-11 rounded-full shadow-md cursor-pointer', isDark && 'border-slate-700 bg-slate-800 text-slate-100')}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </Button>

            <Button
              type="button"
              size="icon"
              onClick={toggleVoiceCall}
              className={cn(
                'size-14 rounded-full text-white shadow-xl transition-transform hover:scale-105 cursor-pointer',
                isCalling ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              )}
              title={isCalling ? 'End Voice Call' : 'Start Voice Call'}
            >
              {isCalling ? <PhoneOff className="size-6" /> : <PhoneCall className="size-6" />}
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB 3: FORMS TAB CONTENT ── */}
      {activeTab === 'forms' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="space-y-1">
            <h3 className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>Connected Forms</h3>
            <p className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Select a form to fill out with AI guidance.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {(agent.connectedForms || [
              { id: 'form_1', name: 'Intake & Inquiry Form', description: 'General inquiry and appointment request' },
            ]).map((form) => (
              <div
                key={form.id}
                className={cn(
                  'p-3 rounded-2xl border flex items-center justify-between',
                  isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
                )}
              >
                <div className="space-y-0.5">
                  <p className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>{form.name || (form as any).title || 'Form'}</p>
                  <p className={cn('text-[10px] line-clamp-1', isDark ? 'text-slate-400' : 'text-slate-500')}>{form.description || 'Fill out and submit form'}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setActiveFormModal(form);
                    onOpenFormInModal?.(form);
                  }}
                  className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Fill Form
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: PRESENTATION TAB CONTENT ── */}
      {activeTab === 'presentation' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
          <div className={cn(
            'p-4 rounded-2xl border space-y-2',
            isDark ? 'bg-indigo-950/30 border-indigo-800/60' : 'bg-indigo-50 border-indigo-200'
          )}>
            <Presentation className="size-8 text-indigo-400 mx-auto" />
            <h3 className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>Interactive AI Presentation</h3>
            <p className={cn('text-[11px]', isDark ? 'text-slate-300' : 'text-slate-600')}>
              {agent.name} is ready to present your services with slides and voice walkthrough.
            </p>
            <Button size="sm" className="h-7 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white mt-2">
              Start Presentation
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB 5: WHATSAPP TAB CONTENT ── */}
      {activeTab === 'whatsapp' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
          <div className={cn(
            'p-5 rounded-2xl border space-y-3',
            isDark ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
          )}>
            <div className="size-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <MessageCircle className="size-6" />
            </div>
            <div>
              <h3 className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>WhatsApp Business Integration</h3>
              <p className={cn('text-[11px] mt-0.5', isDark ? 'text-slate-300' : 'text-slate-600')}>
                {agent.channels?.whatsapp?.phoneNumber
                  ? `Connected: ${agent.channels.whatsapp.phoneNumber}`
                  : 'Configure your WhatsApp number in settings.'}
              </p>
            </div>
            {agent.channels?.whatsapp?.phoneNumber ? (
              <a
                href={`https://wa.me/${agent.channels.whatsapp.phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  agent.channels.whatsapp.welcomeTemplate || `Hi! I would like to chat with ${agent.name}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
              >
                Open WhatsApp Chat <ExternalLink className="size-3" />
              </a>
            ) : (
              <p className="text-[10px] text-amber-400 font-medium">
                Enter your WhatsApp number in the Chatbot Navigation settings.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: HISTORY TAB CONTENT ── */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>Conversation History</h3>
          <div className={cn('p-3 rounded-2xl border space-y-1', isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200')}>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Today, Session #1</span>
              <span>{messages.length} messages</span>
            </div>
            <p className={cn('text-xs font-medium line-clamp-2', isDark ? 'text-slate-200' : 'text-slate-800')}>
              {messages[messages.length - 1]?.text || 'No previous messages.'}
            </p>
          </div>
        </div>
      )}

      {/* ── DYNAMIC FOOTER SUB-TABS (CHAT | VOICE | WHATSAPP | FORMS | PRESENTATION | HISTORY) ── */}
      {navItems.length > 0 && (
        <div
          className={cn(
            'h-12 border-t shrink-0 px-1 flex items-center justify-around',
            isDark ? 'bg-slate-900/95 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
          )}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center text-[10px] font-bold gap-0.5 px-2 py-1 rounded-lg transition-colors',
                  isSelected
                    ? isDark
                      ? 'text-blue-400'
                      : 'text-blue-600'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Icon className="size-3.5" />
                <span className="truncate max-w-[54px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className={cn(
          'py-1 text-center text-[9px] border-t shrink-0',
          isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
        )}
      >
        Powered by <strong className={cn('font-bold', isDark ? 'text-slate-200' : 'text-slate-700')}>Fieseros AI</strong>
      </div>

      {/* ── IN-CHAT CONNECTED FORM MODAL OVERLAY (JotForm AI Agent Style) ── */}
      {activeFormModal && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/40 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-blue-600" />
              <div>
                <h3 className="text-xs font-bold text-foreground line-clamp-1">{activeFormModal.name || (activeFormModal as any).title || 'Form'}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{activeFormModal.description || 'Fill and submit to complete inquiry'}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setActiveFormModal(null)}
              className="size-7 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-y-auto p-2">
            <iframe
              src={`/form/${encodeURIComponent(activeFormModal.id)}`}
              title={activeFormModal.name || (activeFormModal as any).title || 'Form'}
              className="w-full h-full min-h-[440px] border-0 rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
