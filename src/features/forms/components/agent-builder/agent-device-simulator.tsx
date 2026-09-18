'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  ExternalLink,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FormAgentData, ConnectedFormRef } from '@/features/forms/types/agent-types';
import { toast } from 'sonner';

interface AgentDeviceSimulatorProps {
  agent: FormAgentData;
  isTestMode?: boolean;
  onOpenFormInModal?: (form: ConnectedFormRef) => void;
  onRestartSession?: () => void;
}

interface ChatMsg {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedForm?: ConnectedFormRef;
}

export function AgentDeviceSimulator({
  agent,
  isTestMode = true,
  onOpenFormInModal,
  onRestartSession,
}: AgentDeviceSimulatorProps) {
  // In-agent bottom tab: 'chat' | 'voice' | 'forms' | 'history'
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'forms' | 'history'>('chat');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('Listening to your voice...');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting on load
  useEffect(() => {
    setMessages([
      {
        id: 'msg_greet',
        sender: 'ai',
        text: agent.welcomeGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [agent.welcomeGreeting]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || sending) return;

    const userMsg: ChatMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setSending(true);

    try {
      const res = await fetch(`/api/forms/agents/${agent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages,
          agentConfig: agent,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const matchedForm = data.suggestedFormId
        ? agent.connectedForms?.find((f) => f.id === data.suggestedFormId) || agent.connectedForms?.[0]
        : undefined;

      const aiMsg: ChatMsg = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: data.reply || `Thank you for asking. How else may I assist you with ${agent.roleTitle}?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedForm: matchedForm,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'ai',
          text: `I'm here to help you! You can ask questions or fill out our ${agent.connectedForms?.[0]?.name || 'inquiry form'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedForm: agent.connectedForms?.[0],
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleQuickActionClick = (action: any) => {
    if (action.actionType === 'open_form') {
      const form = agent.connectedForms?.find((f) => f.id === action.payload) || agent.connectedForms?.[0];
      if (form) {
        onOpenFormInModal?.(form);
        setActiveTab('forms');
      } else {
        handleSendMessage(action.label);
      }
    } else {
      handleSendMessage(action.payload || action.label);
    }
  };

  const brandColor = agent.brandColor || '#059669';

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-[28px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
      {/* ── 1. AGENT HEADER BANNER ── */}
      <div
        className="px-4 py-3 flex items-center justify-between text-white transition-colors shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="size-9 rounded-full object-cover ring-2 ring-white/40 shadow-xs"
            />
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold leading-tight">{agent.name}</h3>
              <Badge className="bg-white/20 text-white hover:bg-white/30 text-[9px] px-1 py-0 h-3.5 border-none">
                AI
              </Badge>
            </div>
            <p className="text-[10px] text-white/90 leading-tight truncate max-w-[170px]">
              {agent.roleTitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessages([
              {
                id: 'msg_reset',
                sender: 'ai',
                text: agent.welcomeGreeting,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
            onRestartSession?.();
          }}
          className="size-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          title="Reset session"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* ── 2. TAB CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70 dark:bg-slate-900/50">
        {/* ─── A. CHAT TAB ─── */}
        {activeTab === 'chat' && (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'text-white rounded-br-none font-medium'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-none'
                  }`}
                  style={
                    msg.sender === 'user'
                      ? { backgroundColor: brandColor }
                      : undefined
                  }
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Form Recommendation Card attached to AI message */}
                {msg.suggestedForm && (
                  <div
                    className="w-[85%] p-3 border rounded-xl space-y-2 text-left shadow-2xs"
                    style={{
                      backgroundColor: `${brandColor}10`,
                      borderColor: `${brandColor}30`,
                    }}
                  >
                    <div className="flex items-center gap-2" style={{ color: brandColor }}>
                      <FileText className="size-4 shrink-0" />
                      <span className="text-xs font-bold truncate">{msg.suggestedForm.name}</span>
                    </div>
                    {msg.suggestedForm.description && (
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2">
                        {msg.suggestedForm.description}
                      </p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onOpenFormInModal?.(msg.suggestedForm!);
                        setActiveTab('forms');
                      }}
                      className="w-full text-xs h-7 text-white gap-1 font-bold shadow-xs cursor-pointer"
                      style={{ backgroundColor: brandColor }}
                    >
                      Fill Form In-Chat <ArrowRight className="size-3" />
                    </Button>
                  </div>
                )}

                <span className="text-[9px] text-slate-400 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Quick Action Chips (Shown below greeting or when idle) */}
            {messages.length <= 2 && agent.quickActions?.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {agent.quickActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleQuickActionClick(action)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 text-left transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
                  >
                    <span>{action.label}</span>
                    <ArrowRight
                      className="size-3 text-slate-400 group-hover:translate-x-0.5 transition-transform"
                      style={{ color: brandColor }}
                    />
                  </button>
                ))}
              </div>
            )}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                <Loader2 className="size-3.5 animate-spin" style={{ color: brandColor }} />
                <span>{agent.name} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}

        {/* ─── B. VOICE CALL TAB ─── */}
        {activeTab === 'voice' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-6">
            <div className="relative">
              <img
                src={agent.avatarUrl}
                alt={agent.name}
                className="size-24 rounded-full object-cover ring-4 ring-offset-4 ring-offset-background transition-all"
                style={{
                  boxShadow: isCalling ? `0 0 24px ${brandColor}60` : undefined,
                  borderColor: brandColor,
                }}
              />
              {isCalling && (
                <span
                  className="absolute -bottom-2 -right-2 size-7 rounded-full text-white flex items-center justify-center shadow-md animate-bounce"
                  style={{ backgroundColor: brandColor }}
                >
                  <Volume2 className="size-4" />
                </span>
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Voice Agent: {agent.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isCalling ? 'Live Real-Time Audio Call Active' : 'Ready to start live voice call'}
              </p>
            </div>

            {/* Audio Soundwave visualizer */}
            {isCalling && (
              <div
                className="flex items-center gap-1.5 h-10 px-6 py-2 border rounded-full"
                style={{
                  backgroundColor: `${brandColor}10`,
                  borderColor: `${brandColor}30`,
                }}
              >
                {[40, 70, 95, 60, 85, 45, 100, 65, 30, 80].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%`, backgroundColor: brandColor }}
                    className="w-1 rounded-full animate-pulse transition-all duration-300"
                  />
                ))}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 italic">
              "{isCalling ? voiceTranscript : `Tap Start Voice Call below to talk with ${agent.name} via browser audio.`}"
            </p>

            <Button
              type="button"
              onClick={() => {
                if (isCalling) {
                  setIsCalling(false);
                  toast.info('Voice call ended');
                } else {
                  setIsCalling(true);
                  setVoiceTranscript(`Hello! I'm ${agent.name}. How can I help you today?`);
                  toast.success('Live Voice Call connected!');
                }
              }}
              className="w-full max-w-xs text-xs font-bold h-11 gap-2 shadow-md cursor-pointer"
              style={{
                backgroundColor: isCalling ? '#dc2626' : brandColor,
                color: '#ffffff',
              }}
            >
              {isCalling ? (
                <>
                  <PhoneOff className="size-4" /> End Voice Call
                </>
              ) : (
                <>
                  <PhoneCall className="size-4" /> Start Live Voice Call
                </>
              )}
            </Button>
          </div>
        )}

        {/* ─── C. FORMS DIRECTORY TAB ─── */}
        {activeTab === 'forms' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Connected AI Forms</span>
              <Badge variant="secondary" className="text-[10px]">
                {agent.connectedForms?.length || 0} Available
              </Badge>
            </div>

            {agent.connectedForms?.map((form) => (
              <Card
                key={form.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-border transition-all bg-white dark:bg-slate-800 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="size-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${brandColor}15`,
                      color: brandColor,
                    }}
                  >
                    <FileText className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {form.name}
                    </h4>
                    {form.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {form.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>{form.submissionCount || 1} submissions</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onOpenFormInModal?.(form)}
                        className="h-6 text-[10px] text-white px-2.5 rounded-md gap-1 font-bold cursor-pointer"
                        style={{ backgroundColor: brandColor }}
                      >
                        Fill Form <ArrowRight className="size-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ─── D. HISTORY TAB ─── */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Conversation History</span>
              <span className="text-[10px] text-slate-400">Current Session</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5" style={{ color: brandColor }}>
                  <CheckCircle2 className="size-3.5" /> Active Session
                </span>
                <span className="text-[10px] text-slate-400">{messages.length} messages</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Last message: "{messages[messages.length - 1]?.text.slice(0, 60)}..."
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. BOTTOM INPUT BAR (ONLY IN CHAT TAB) ── */}
      {activeTab === 'chat' && (
        <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-1.5"
          >
            <button
              type="button"
              className="size-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Attach photo or document"
              onClick={() => toast.info('Photo/File attachment ready')}
            >
              <Paperclip className="size-4" />
            </button>
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type here..."
              className="flex-1 h-9 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl"
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => {
                setActiveTab('voice');
                setIsCalling(true);
                setVoiceTranscript(`Hello! I'm ${agent.name}. How can I help you today?`);
              }}
              className="size-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              style={{
                backgroundColor: `${brandColor}15`,
                color: brandColor,
              }}
              title="Voice mode"
            >
              <Mic className="size-4" />
            </button>
            <Button
              type="submit"
              size="sm"
              disabled={!inputText.trim() || sending}
              className="size-8 p-0 text-white rounded-xl shrink-0 shadow-xs cursor-pointer font-bold"
              style={{ backgroundColor: brandColor }}
            >
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      )}

      {/* ── 4. IN-AGENT 4-TAB NAVIGATION BAR ── */}
      <div className="h-12 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-4 shrink-0">
        {agent.navigation?.chatEnabled && (
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className="flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
            style={{
              color: activeTab === 'chat' ? brandColor : undefined,
              fontWeight: activeTab === 'chat' ? 700 : 400,
            }}
          >
            <MessageSquare className="size-4" />
            <span className="text-[10px]">Chat</span>
          </button>
        )}

        {agent.navigation?.voiceEnabled && (
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className="flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
            style={{
              color: activeTab === 'voice' ? brandColor : undefined,
              fontWeight: activeTab === 'voice' ? 700 : 400,
            }}
          >
            <Mic className="size-4" />
            <span className="text-[10px]">Voice</span>
          </button>
        )}

        {agent.navigation?.formsEnabled && (
          <button
            type="button"
            onClick={() => setActiveTab('forms')}
            className="flex flex-col items-center justify-center gap-0.5 transition-colors relative cursor-pointer"
            style={{
              color: activeTab === 'forms' ? brandColor : undefined,
              fontWeight: activeTab === 'forms' ? 700 : 400,
            }}
          >
            <FileText className="size-4" />
            <span className="text-[10px]">Forms</span>
            {agent.connectedForms?.length > 0 && (
              <span
                className="absolute top-2 right-5 size-1.5 rounded-full"
                style={{ backgroundColor: brandColor }}
              />
            )}
          </button>
        )}

        {agent.navigation?.historyEnabled && (
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className="flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
            style={{
              color: activeTab === 'history' ? brandColor : undefined,
              fontWeight: activeTab === 'history' ? 700 : 400,
            }}
          >
            <History className="size-4" />
            <span className="text-[10px]">History</span>
          </button>
        )}
      </div>

      {/* Footer Branding */}
      <div className="py-1 bg-slate-100 dark:bg-slate-950 text-center border-t border-slate-200/40">
        <p className="text-[9px] text-slate-400">
          Powered by <span className="font-bold text-slate-600 dark:text-slate-300">Fieseros AI</span>
        </p>
      </div>
    </div>
  );
}
