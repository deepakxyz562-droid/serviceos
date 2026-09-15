'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Send,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Phone,
  User,
  ShieldCheck,
  Bot,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  card?: {
    type: 'slot_picker' | 'quote_card' | 'booking_confirmation' | string;
    service?: string;
    date?: string;
    slots?: string[];
    estimate?: string;
    leadId?: string;
    name?: string;
    time?: string;
  };
}

export default function PublicChatPage() {
  const params = useParams();
  const agentId = (params?.agentId as string) || '';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 Hi! I am your 24/7 AI Assistant. How can I help you today? Feel free to ask about our services, pricing, or book an appointment!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState('Service Assistant');

  // Booking Modal / Card State
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string; service: string } | null>(null);
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || input.trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!userPrompt) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/public/ai/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          message: textToSend,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();
      if (data.businessName) {
        setBusinessName(data.businessName);
      }

      const botMessage: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Thank you for reaching out!',
        card: data.card,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I am having trouble connecting. Please leave your phone number and we will call you back!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (date: string, time: string, service?: string) => {
    setSelectedSlot({ date, time, service: service || 'General Service' });
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    if (!bookingPhone.trim() && !bookingName.trim()) {
      toast.error('Please enter your name and phone number to confirm');
      return;
    }

    setBookingSubmitting(true);
    try {
      const res = await fetch('/api/public/ai/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          action: 'confirm_booking',
          bookingData: {
            name: bookingName,
            phone: bookingPhone,
            service: selectedSlot.service,
            date: selectedSlot.date,
            time: selectedSlot.time,
          },
        }),
      });

      const data = await res.json();
      setSelectedSlot(null);
      setBookingName('');
      setBookingPhone('');

      const botMessage: Message = {
        id: `confirm-${Date.now()}`,
        role: 'assistant',
        content: data.reply || '🎉 Your appointment request is confirmed!',
        card: data.card,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (e) {
      toast.error('Failed to confirm booking. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const quickChips = [
    '📅 Book an appointment',
    '💰 What are your rates?',
    '⚡ Are you available for emergency service?',
    '📍 What areas do you serve?',
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="size-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow">
              <Bot className="size-5" />
            </div>
            <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">{businessName}</h1>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700 dark:text-emerald-300 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50">
                AI Online
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Replies instantly 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="size-4 text-emerald-600" />
          <span>Verified Provider</span>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl w-full mx-auto">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-xs shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bl-xs shadow-sm'
                }`}
              >
                {m.content}
              </div>

              {/* Slot Picker Card */}
              {m.card?.type === 'slot_picker' && m.card.slots && (
                <Card className="max-w-md w-full border-emerald-200 dark:border-emerald-800/60 shadow-md bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 pb-3 pt-3 px-4">
                    <CardTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Calendar className="size-4 text-emerald-600" /> Available Appointment Slots ({m.card.date})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Select a preferred time for <span className="font-semibold text-emerald-600">{m.card.service || 'Service Consultation'}</span>:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {m.card.slots.map((slot) => (
                        <Button
                          key={slot}
                          variant="outline"
                          size="sm"
                          className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-600 hover:text-white text-xs font-medium gap-1 justify-center py-2 h-auto"
                          onClick={() => handleSlotSelect(m.card?.date || 'Today', slot, m.card?.service)}
                        >
                          <Clock className="size-3" /> {slot}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quote Card */}
              {m.card?.type === 'quote_card' && (
                <Card className="max-w-sm w-full border-purple-200 dark:border-purple-800/60 shadow-sm bg-purple-50/30 dark:bg-purple-950/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Estimated Price</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{m.card.service}</p>
                    </div>
                    <Badge className="bg-purple-600 text-white text-xs px-2.5 py-1">
                      {m.card.estimate}
                    </Badge>
                  </div>
                </Card>
              )}

              {/* Booking Confirmation Card */}
              {m.card?.type === 'booking_confirmation' && (
                <Card className="max-w-md w-full border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/30 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Appointment Requested</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Service: <strong>{m.card.service}</strong><br />
                        Date & Time: <strong>{m.card.date} at {m.card.time}</strong>
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl max-w-[200px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <Loader2 className="size-3.5 animate-spin text-emerald-600" />
            <span>AI is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Booking Slot Selection Drawer / Sheet */}
      {selectedSlot && (
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-lg shrink-0">
          <div className="max-w-xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-600">Selected Slot</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedSlot.date} at {selectedSlot.time} ({selectedSlot.service})
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSlot(null)} className="text-xs">
                Cancel
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Your Name"
                value={bookingName}
                onChange={(e) => setBookingName(e.target.value)}
                className="text-xs h-9"
              />
              <Input
                placeholder="Phone Number (for confirmation)"
                value={bookingPhone}
                onChange={(e) => setBookingPhone(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold gap-1.5"
              onClick={handleConfirmBooking}
              disabled={bookingSubmitting}
            >
              {bookingSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Confirm Appointment Request
            </Button>
          </div>
        </div>
      )}

      {/* Footer Input */}
      <footer className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Quick chips if conversation is young */}
          {messages.length <= 3 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {quickChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="text-[11px] whitespace-nowrap bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or request a booking..."
              disabled={loading}
              className="text-xs sm:text-sm h-10 rounded-xl"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl size-10 p-0 shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}
