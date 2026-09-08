"use client";

import { useState } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  User,
  Mail,
  Building,
  Tag,
  MessageSquare,
  ArrowRight,
  Headphones,
  DollarSign,
  Wrench,
  HelpCircle,
  ShieldCheck,
  Handshake,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const subjectCategories = [
  {
    id: "Sales & Pricing",
    label: "Sales & Pricing",
    icon: DollarSign,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    desc: "Custom pricing, demos, and enterprise plans",
  },
  {
    id: "Technical Support",
    label: "Tech Support",
    icon: Wrench,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    desc: "Help with features, bugs, or troubleshooting",
  },
  {
    id: "Integrations",
    label: "Integrations",
    icon: Sparkles,
    color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
    desc: "API, webhooks, QuickBooks, Stripe, PayPal",
  },
  {
    id: "Billing",
    label: "Billing & Account",
    icon: Headphones,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    desc: "Invoices, payment methods, or subscriptions",
  },
  {
    id: "Partnership",
    label: "Partnerships",
    icon: Handshake,
    color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
    desc: "Affiliate, agency, and technology partnerships",
  },
  {
    id: "General Inquiry",
    label: "General Inquiry",
    icon: HelpCircle,
    color: "text-teal-600 bg-teal-500/10 border-teal-500/20",
    desc: "Questions, feedback, or general information",
  },
];

const allSubjectOptions = [
  "Sales & Pricing",
  "Technical Support",
  "Integrations",
  "Billing",
  "Partnership",
  "General Inquiry",
  "Data & Privacy",
  "Other",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [subject, setSubject] = useState("Sales & Pricing");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSubmissionRef, setLastSubmissionRef] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, subject, message }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          toast.error("Too many submissions. Please try again in a few minutes.");
        } else {
          toast.error(data?.error || "Failed to send message. Please try again.");
        }
        return;
      }

      const refId = data?.messageId || `ref-${Date.now().toString(36)}`;
      setLastSubmissionRef(refId);
      setIsSubmitted(true);

      toast.success("Message sent successfully!", {
        description: "Our team will respond to your inbox within 24 hours.",
      });

      // Reset form fields
      setName("");
      setEmail("");
      setCompany("");
      setSubject("Sales & Pricing");
      setMessage("");
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-background shadow-md overflow-hidden animate-in fade-in duration-300">
        <CardContent className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-500/5 animate-in zoom-in-50 duration-300">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <Badge variant="outline" className="mb-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
            Message Delivered
          </Badge>

          <h3 className="text-2xl font-bold text-foreground mb-2">
            Thank you for reaching out!
          </h3>

          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6 leading-relaxed">
            We&apos;ve received your message and sent a confirmation to your email. Our dedicated team is reviewing your request and will get back to you shortly.
          </p>

          {lastSubmissionRef && (
            <div className="bg-muted/50 border border-border/80 rounded-lg px-4 py-2 text-xs text-muted-foreground font-mono mb-8">
              Reference ID: <span className="font-semibold text-foreground">{lastSubmissionRef}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsSubmitted(false)}
              className="gap-2 text-xs h-9"
            >
              Send Another Message
            </Button>
            <Button
              variant="default"
              asChild
              className="gap-2 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <a href="/docs/notifications-setup">
                Browse Documentation <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2.5 text-xl font-bold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </span>
            Send Us a Message
          </CardTitle>

          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Avg Response: &lt; 2 hrs</span>
          </div>
        </div>

        <CardDescription className="text-sm text-muted-foreground pt-1">
          Have questions about Fieseros, features, or pricing? Fill out the details below and we&apos;ll be in touch.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Quick Topic Selector Pills */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              What can we help you with? <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {subjectCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = subject === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSubject(cat.id)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all",
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500/30"
                        : "border-border/70 hover:border-border hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & Email row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-sm focus-visible:ring-emerald-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Business Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-sm focus-visible:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Company & Full Subject Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs font-medium flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                Company / Trade Business
              </Label>
              <Input
                id="company"
                type="text"
                placeholder="e.g. Apex Plumbing LLC"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-10 text-sm focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subject-select" className="text-xs font-medium flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Specific Subject <span className="text-destructive">*</span>
              </Label>
              <Select value={subject} onValueChange={setSubject} required>
                <SelectTrigger id="subject-select" className="h-10 text-sm focus:ring-emerald-500">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {allSubjectOptions.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-sm">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="text-xs font-medium flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                How can we assist you? <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {message.length}/5000
              </span>
            </div>
            <Textarea
              id="message"
              placeholder="Tell us more about your inquiry, business requirements, or how we can help..."
              className="min-h-[130px] resize-y text-sm focus-visible:ring-emerald-500 leading-relaxed"
              value={message}
              maxLength={5000}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          {/* Submit Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Your data is encrypted &amp; never shared with third parties.
            </p>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-6 font-medium text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-sm transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending Message...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
