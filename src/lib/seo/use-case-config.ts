import {
  Target,
  CalendarCheck,
  FileText,
  CreditCard,
  Star,
  Mail,
  MessageSquare,
  Route,
  type LucideIcon,
} from "lucide-react";
import type { Feature } from "@/components/seo/feature-grid";
import type { FaqItem } from "@/lib/seo/schemas";

export interface UseCaseConfig {
  slug: string;
  titleTag: string;
  h1: string;
  eyebrow: string;
  metaDescription: string;
  heroSubtitle: string;
  icon: LucideIcon;
  metrics: { value: string; label: string }[];
  features: Feature[];
  workflow: { step: string; title: string; description: string }[];
  painPoints: { problem: string; fieserosSolution: string }[];
  faqs: FaqItem[];
  relatedUseCases: { label: string; href: string }[];
}

export const useCases: UseCaseConfig[] = [
  {
    slug: "lead-capture",
    titleTag: "AI Lead Capture & Qualification Software | Fieseros",
    h1: "Capture and qualify every lead — automatically",
    eyebrow: "Use Case · Lead Capture",
    metaDescription:
      "Fieseros AI lead capture turns website visitors, phone calls, and form submissions into qualified leads 24/7. AI conversations collect job details, budget, and urgency so your team only talks to ready-to-book customers.",
    heroSubtitle:
      "Website chat, phone calls, SMS, and embedded forms all feed into one qualified lead pipeline. The AI agent asks the right questions, scores urgency, and routes hot leads instantly — so no opportunity slips through after hours.",
    icon: Target,
    metrics: [
      { value: "24/7", label: "Lead capture, never sleeps" },
      { value: "+38%", label: "More qualified leads captured" },
      { value: "<60s", label: "Avg lead response time" },
    ],
    features: [
      {
        icon: MessageSquare,
        badge: "AI Chat",
        title: "Conversational Lead Intake",
        description:
          "An AI agent greets every website visitor, asks qualifying questions about their job, and captures structured data — service type, urgency, location, budget — without a human on the other end.",
      },
      {
        icon: Target,
        badge: "Scoring",
        title: "Automatic Lead Scoring",
        description:
          "Every lead is tagged Hot, Warm, or Cold based on urgency, budget, and job size. Hot leads trigger an instant SMS to the owner; cold leads enter a nurture sequence.",
      },
      {
        icon: Route,
        title: "Smart Routing to the Right Tech",
        description:
          "Leads auto-route by trade, territory, and availability so the right technician gets the lead in seconds — not the next morning's inbox shuffle.",
      },
      {
        icon: Mail,
        title: "Multi-Channel Capture",
        description:
          "Web chat, phone (answered by AI Voice Receptionist), SMS, email-inbound, and embedded forms all create leads in one unified inbox with full context.",
      },
      {
        icon: CalendarCheck,
        title: "Instant Booking Hand-off",
        description:
          "Qualified leads can self-book an appointment slot directly in the conversation — converting interest to a scheduled job before the competitor calls back.",
      },
      {
        icon: FileText,
        title: "Structured Lead Records",
        description:
          "Every lead becomes a structured CRM record with job details, source attribution, conversation transcript, and qualification answers — no more scribbled notes.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Visitor arrives",
        description:
          "A homeowner lands on your site from Google at 9pm. The AI chat agent opens instantly and greets them by name.",
      },
      {
        step: "2",
        title: "AI qualifies",
        description:
          "The agent asks: what's the issue, how urgent, your address, and a good time to come out. Answers are captured as structured fields.",
      },
      {
        step: "3",
        title: "Lead is scored",
        description:
          "Fieseros scores the lead Hot (burst pipe, tonight) and fires an SMS + push notification to the on-call plumber.",
      },
      {
        step: "4",
        title: "Booked & tracked",
        description:
          "The customer picks a slot, a job is created on the dispatch board, and the lead source is attributed for ROI reporting.",
      },
    ],
    painPoints: [
      {
        problem: "Leads email after hours and book with whoever calls back first — usually a competitor.",
        fieserosSolution:
          "AI captures and responds to every inbound lead in under 60 seconds, 24/7, so you never lose a job to a faster competitor.",
      },
      {
        problem: "Your team wastes hours calling tire-kickers with no budget or vague requests.",
        fieserosSolution:
          "AI qualification scores every lead and only routes the ready-to-book ones to humans — tire-kickers get an automated nurture sequence instead.",
      },
      {
        problem: "Lead source ROI is a guess because leads land in a notebook, a spreadsheet, and three inboxes.",
        fieserosSolution:
          "Every lead — chat, call, SMS, form — lands in one CRM record with source attribution, so you know exactly which channel drives revenue.",
      },
    ],
    faqs: [
      {
        question: "How does the AI lead capture agent know what to ask?",
        answer:
          "The agent is trained on your services, service area, and common job types. You can customize the qualifying questions (urgency, budget, property type, photos) per service line. It adapts its questions based on the visitor's answers.",
      },
      {
        question: "Can I use AI lead capture without replacing my existing website?",
        answer:
          "Yes. The AI chat agent and embedded forms work on any site — WordPress, Shopify, Wix, Webflow, or custom HTML. You paste one snippet and the agent is live.",
      },
      {
        question: "What happens to leads when my team is offline?",
        answer:
          "Hot leads trigger an SMS + push notification to the on-call owner instantly. If no one claims it in 5 minutes, the AI sends an automated reply acknowledging the request and offering the next available slot.",
      },
      {
        question: "Does this replace my contact form?",
        answer:
          "It can, but most customers keep their form and add the AI agent alongside it. The agent captures leads that would otherwise bounce from a long form, while traditional form submissions still flow into the same CRM.",
      },
    ],
    relatedUseCases: [
      { label: "Appointment Booking", href: "/use-cases/appointment-booking" },
      { label: "Lead Nurturing", href: "/use-cases/lead-nurturing" },
      { label: "Quote Generation", href: "/use-cases/quote-generation" },
    ],
  },
  {
    slug: "appointment-booking",
    titleTag: "24/7 Automated Appointment Booking for Service Businesses | Fieseros",
    h1: "Let customers self-book appointments — day or night",
    eyebrow: "Use Case · Appointment Booking",
    metaDescription:
      "Fieseros appointment booking lets customers self-schedule jobs 24/7 through AI chat, embedded forms, or your website. Real-time availability, smart routing, automatic reminders — no more phone tag.",
    heroSubtitle:
      "Customers book the moment they're ready — not when you call them back. AI chat and embedded scheduling show real-time availability, assign the right technician, and send reminders that slash no-shows.",
    icon: CalendarCheck,
    metrics: [
      { value: "67%", label: "Of jobs booked after hours" },
      { value: "-41%", label: "Fewer no-shows with reminders" },
      { value: "Real-time", label: "Availability sync" },
    ],
    features: [
      {
        icon: CalendarCheck,
        badge: "Self-Serve",
        title: "Customer Self-Booking",
        description:
          "Customers pick a slot from your real-time availability — no phone tag, no back-and-forth. Works in the AI chat widget, embedded booking form, or your website.",
      },
      {
        icon: Route,
        title: "Technician-Aware Scheduling",
        description:
          "Availability reflects each technician's territory, skills, and existing route — so a booked slot is always assignable to the right person, not just 'someone'.",
      },
      {
        icon: MessageSquare,
        badge: "AI",
        title: "Conversational Booking",
        description:
          "The AI agent handles the whole booking conversation: 'What day works? Morning or afternoon? Your address?' — then confirms and adds it to the calendar.",
      },
      {
        icon: Mail,
        title: "Automated Reminders",
        description:
          "SMS + email reminders fire 24 hours and 1 hour before the appointment. Customers can confirm, reschedule, or cancel by replying — reducing no-shows by up to 41%.",
      },
      {
        icon: CreditCard,
        title: "Deposit or Pre-Pay at Booking",
        description:
          "Optional no-show protection: collect a deposit or full payment at booking time through Stripe, Razorpay, or PayPal. Refundable cancellation policies build trust.",
      },
      {
        icon: Target,
        title: "Google Meet & On-Site Modes",
        description:
          "Bookings support virtual (Google Meet link auto-generated) or on-site appointments with address capture and travel-time-aware slot calculation.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Customer requests",
        description:
          "Through chat, form, or phone — the customer says 'I need someone Thursday morning'.",
      },
      {
        step: "2",
        title: "AI checks availability",
        description:
          "Fieseros shows real-time slots based on technician availability, territory, and route.",
      },
      {
        step: "3",
        title: "Slot confirmed",
        description:
          "The customer picks 9am. A job is created, assigned, and the calendar updates for the whole team instantly.",
      },
      {
        step: "4",
        title: "Reminder + arrival",
        description:
          "Automated SMS reminder fires 24h and 1h before. Tech gets turn-by-turn directions in the mobile app.",
      },
    ],
    painPoints: [
      {
        problem: "You spend 2+ hours a day playing phone tag to confirm appointment times.",
        fieserosSolution:
          "Self-booking lets customers pick a slot in 30 seconds. Reminders confirm automatically. Your phone time drops to actual sales calls.",
      },
      {
        problem: "No-shows waste technician hours and kill route efficiency.",
        fieserosSolution:
          "Automated SMS reminders with one-tap confirm/reschedule cut no-shows by up to 41%. Optional deposits protect revenue on high-value jobs.",
      },
      {
        problem: "Bookings after hours go to voicemail and the customer books the competitor who answers.",
        fieserosSolution:
          "AI chat and embedded booking work 24/7. 67% of bookings happen outside business hours — Fieseros captures them while you sleep.",
      },
    ],
    faqs: [
      {
        question: "Can customers reschedule or cancel on their own?",
        answer:
          "Yes. Reminders include a reschedule link. Customers can pick a new slot or cancel directly — the calendar updates instantly and the tech is notified. You can require approval for cancellations within 24h of the appointment.",
      },
      {
        question: "How does booking sync with my existing calendar?",
        answer:
          "Fieseros has its own dispatch calendar, and supports Google Calendar two-way sync so personal appointments block availability. iCal export is available for any other calendar app.",
      },
      {
        question: "Can I require a deposit to book?",
        answer:
          "Yes. You can require a deposit or full pre-payment at booking through Stripe, Razorpay, or PayPal. Deposits are refundable based on your cancellation policy, which you configure per service.",
      },
      {
        question: "Does booking account for travel time between jobs?",
        answer:
          "Yes. Slot availability factors in the technician's existing route and travel time between jobs, so you never overbook a tech who can't physically make the drive.",
      },
    ],
    relatedUseCases: [
      { label: "Lead Capture", href: "/use-cases/lead-capture" },
      { label: "Job Dispatch", href: "/use-cases/job-dispatch" },
      { label: "Review Collection", href: "/use-cases/review-collection" },
    ],
  },
  {
    slug: "quote-generation",
    titleTag: "Automated Quote & Estimate Generation Software | Fieseros",
    h1: "Turn job requests into quotes in minutes, not days",
    eyebrow: "Use Case · Quote Generation",
    metaDescription:
      "Fieseros AI quote generation builds line-item estimates from a conversation or photos in minutes. Email + SMS delivery, e-signature approval, and one-tap conversion to a job and invoice.",
    heroSubtitle:
      "Stop losing jobs to competitors who quote faster. AI builds line-item estimates from the customer's description and photos, delivers them by SMS + email, and collects an e-signature — all before you finish your coffee.",
    icon: FileText,
    metrics: [
      { value: "<5 min", label: "From request to sent quote" },
      { value: "+27%", label: "Higher quote-to-job win rate" },
      { value: "E-sign", label: "Approval built in" },
    ],
    features: [
      {
        icon: FileText,
        badge: "AI",
        title: "AI-Drafted Estimates",
        description:
          "Describe the job or upload photos — the AI drafts a line-item estimate with quantities, labor, and materials based on your pricebook. You review and send.",
      },
      {
        icon: Target,
        title: "Tiered Quote Options",
        description:
          "Send Good / Better / Best options so customers can choose their budget. Tiered quotes win 27% more jobs than single-price estimates.",
      },
      {
        icon: CreditCard,
        title: "Deposit with Acceptance",
        description:
          "Customers accept the quote with an e-signature and pay the deposit in the same flow — converting an approved quote to a booked, paid job instantly.",
      },
      {
        icon: Mail,
        title: "SMS + Email Delivery",
        description:
          "Quotes go out by both SMS and email with a tracking pixel. You see when the customer opens it, so you know exactly when to follow up.",
      },
      {
        icon: CalendarCheck,
        title: "One-Tap Conversion to Job",
        description:
          "When a customer accepts, Fieseros auto-creates the job on the dispatch board, assigns the right tech, and queues the invoice — no double entry.",
      },
      {
        icon: MessageSquare,
        title: "Quote Negotiation in Chat",
        description:
          "Customers can reply to the quote in chat to ask for changes. The AI suggests adjusted line items and re-sends a revised quote without starting over.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Request + photos",
        description:
          "Customer describes the job in chat or uploads photos of the issue (a leaking water heater, a fence to replace).",
      },
      {
        step: "2",
        title: "AI drafts estimate",
        description:
          "Fieseros drafts a line-item estimate from your pricebook — labor, materials, quantities, tax — in seconds.",
      },
      {
        step: "3",
        title: "You review + send",
        description:
          "You tweak pricing or add tiers, then send by SMS + email. The customer gets a branded, trackable quote link.",
      },
      {
        step: "4",
        title: "Accept + deposit",
        description:
          "Customer e-signs and pays the deposit. A job is created, the tech is assigned, and the invoice is queued — all from one acceptance.",
      },
    ],
    painPoints: [
      {
        problem: "You spend evenings building estimates in Word and lose jobs to faster competitors.",
        fieserosSolution:
          "AI drafts line-item estimates in under 5 minutes from a job description or photos. You review, send, and win the job before the competitor even replies.",
      },
      {
        problem: "Approved quotes sit in your inbox for days because following up feels pushy.",
        fieserosSolution:
          "Open-tracking tells you exactly when the customer viewed the quote. Automated follow-up SMS fires 24h later with a friendly nudge — no awkward calls.",
      },
      {
        problem: "Quotes get accepted verbally and then nobody remembers the agreed scope.",
        fieserosSolution:
          "Every quote is e-signed and stored on the customer's record. When it's accepted, the job scope, price, and deposit are locked in — no scope creep, no he-said-she-said.",
      },
    ],
    faqs: [
      {
        question: "Can the AI generate quotes for any trade?",
        answer:
          "The AI uses your pricebook — your labor rates, material costs, and common job templates — so quotes reflect your actual pricing. It works for plumbing, HVAC, electrical, landscaping, cleaning, handyman, and any service with line-item work.",
      },
      {
        question: "What if the AI's estimate is wrong?",
        answer:
          "Every AI-drafted estimate is a starting point you review before sending. You can edit any line item, quantity, or price. Over time, the AI learns from your edits and your accepted/declined quotes to improve accuracy.",
      },
      {
        question: "Do I need a separate e-signature tool?",
        answer:
          "No. E-signatures are built into every quote. Customers sign on their phone or computer, the signed quote is stored on the customer record, and the deposit is collected in the same flow.",
      },
      {
        question: "Can I send quotes from my phone in the field?",
        answer:
          "Yes. The mobile PWA lets you generate and send quotes from anywhere. Field techs can quote upsells on-site — 'want me to replace this while I'm here?' — and collect approval instantly.",
      },
    ],
    relatedUseCases: [
      { label: "Payment Collection", href: "/use-cases/payment-collection" },
      { label: "Lead Capture", href: "/use-cases/lead-capture" },
      { label: "Appointment Booking", href: "/use-cases/appointment-booking" },
    ],
  },
  {
    slug: "payment-collection",
    titleTag: "Online Payment Collection for Contractors | Fieseros",
    h1: "Get paid on the job — not 30 days later",
    eyebrow: "Use Case · Payment Collection",
    metaDescription:
      "Fieseros payment collection lets contractors accept cards, ACH, Apple Pay, and cash on-site through Stripe, Razorpay, and PayPal. Send invoices, take deposits, and reconcile — all in one platform.",
    heroSubtitle:
      "Stop chasing unpaid invoices. Collect deposits at booking, take payment on-site with a tap, and send branded invoices that customers pay from their phone. 33 gateways, instant reconciliation.",
    icon: CreditCard,
    metrics: [
      { value: "33", label: "Payment gateways supported" },
      { value: "-63%", label: "Days sales outstanding" },
      { value: "On-site", label: "Tap-to-pay accepted" },
    ],
    features: [
      {
        icon: CreditCard,
        badge: "33 Gateways",
        title: "Stripe, Razorpay & PayPal",
        description:
          "Accept cards, ACH, Apple Pay, Google Pay, and buy-now-pay-later through 33 supported gateways. Customers pay however they want — no friction.",
      },
      {
        icon: CalendarCheck,
        title: "Deposits at Booking",
        description:
          "Require a deposit to lock in the appointment. Deposits protect you from no-shows and commit the customer — fully refundable per your cancellation policy.",
      },
      {
        icon: FileText,
        title: "Branded Invoice Delivery",
        description:
          "Send professional, branded invoices by SMS + email with a one-tap pay link. Customers pay from their phone in 30 seconds without logging in.",
      },
      {
        icon: MessageSquare,
        title: "On-Site Tap-to-Pay",
        description:
          "Techs collect payment on-site before they leave — tap-to-pay on phone, card, or cash. The job closes paid and the customer gets an instant receipt.",
      },
      {
        icon: Target,
        title: "Automated Payment Reminders",
        description:
          "Unpaid invoices trigger escalating SMS + email reminders on your schedule. Past-due accounts get a polite nudge, then a firmer follow-up — all automated.",
      },
      {
        icon: Mail,
        title: "Recurring Billing",
        description:
          "Maintenance contracts and subscription plans auto-charge on schedule. Set it once and Fieseros generates invoices, charges the card, and reconciles — every month.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Deposit at booking",
        description:
          "Customer books the appointment and pays a 25% deposit through Stripe — securing the slot.",
      },
      {
        step: "2",
        title: "Job completed",
        description:
          "Tech finishes the work, marks the job complete in the mobile app, and the final invoice auto-generates from the quote.",
      },
      {
        step: "3",
        title: "On-site collection",
        description:
          "Tech taps 'Collect Payment' on their phone, the customer taps their card or Apple Pay, and the balance is captured.",
      },
      {
        step: "4",
        title: "Reconciled",
        description:
          "Payment hits your bank, the invoice is marked paid, the customer gets a receipt, and your books reconcile automatically.",
      },
    ],
    painPoints: [
      {
        problem: "Invoices sit unpaid for 30-60 days because customers 'forgot' or can't find the link.",
        fieserosSolution:
          "Branded SMS invoices with one-tap pay links get paid in an average of 2 days. Automated reminders follow up on your schedule — no awkward collection calls.",
      },
      {
        problem: "You do the work, then the customer disputes the scope or price.",
        fieserosSolution:
          "Quotes are e-signed before the job starts and deposits are collected. When the job scope is locked in writing, disputes drop to near zero.",
      },
      {
        problem: "Reconciling payments across Stripe, cash, and checks is an end-of-month nightmare.",
        fieserosSolution:
          "All payments — card, ACH, cash, check — reconcile automatically against invoices in Fieseros. Your books are always up to date; no more spreadsheet wrangling.",
      },
    ],
    faqs: [
      {
        question: "Which payment gateways are supported?",
        answer:
          "Fieseros supports 33 gateways including Stripe, Razorpay, PayPal, Square, Authorize.net, and Braintree. Each supports cards, ACH/bank transfer, Apple Pay, and Google Pay. You connect one or many and route by currency, region, or service type.",
      },
      {
        question: "How fast do I get my money?",
        answer:
          "Payout timing depends on the gateway — Stripe is typically 2 business days, PayPal is instant to your PayPal balance, ACH is 3-4 days. Fieseros tracks payment status but payout speed is set by your gateway.",
      },
      {
        question: "Can customers pay in installments?",
        answer:
          "Yes. You can split an invoice into multiple scheduled payments, set up recurring billing for maintenance contracts, or offer buy-now-pay-later through supported gateways like Affirm and Klarna.",
      },
      {
        question: "What about cash and check payments?",
        answer:
          "Techs can record cash or check payments on-site in the mobile app. The invoice is marked paid and reconciled just like a card payment — no separate tracking.",
      },
    ],
    relatedUseCases: [
      { label: "Quote Generation", href: "/use-cases/quote-generation" },
      { label: "Appointment Booking", href: "/use-cases/appointment-booking" },
      { label: "Lead Nurturing", href: "/use-cases/lead-nurturing" },
    ],
  },
  {
    slug: "review-collection",
    titleTag: "Automated Review Collection for Service Businesses | Fieseros",
    h1: "Automatically collect 5-star Google reviews",
    eyebrow: "Use Case · Review Collection",
    metaDescription:
      "Fieseros automated review collection sends Google review requests the moment a job is marked complete. AI filters negative feedback, follows up with happy customers, and boosts your local SEO ranking.",
    heroSubtitle:
      "Your reputation is built in the 24 hours after a job is done. Fieseros sends a personalized review request the moment the tech marks the job complete — and routes unhappy customers to private feedback before they post publicly.",
    icon: Star,
    metrics: [
      { value: "+4.2x", label: "More Google reviews" },
      { value: "92%", label: "Of requests sent within 1 hour" },
      { value: "4.9★", label: "Avg rating after filtering" },
    ],
    features: [
      {
        icon: Star,
        badge: "Automated",
        title: "Instant Review Requests",
        description:
          "The moment a tech marks a job complete, the customer gets a branded SMS asking for a Google review — while the great service is fresh in their mind.",
      },
      {
        icon: Target,
        title: "Sentiment-Based Routing",
        description:
          "Happy customers get a one-tap link to Google Reviews. Unhappy ones get routed to a private feedback form first — protecting your public rating from one-star rants.",
      },
      {
        icon: MessageSquare,
        title: "AI Personalization",
        description:
          "Each request references the actual job — 'How was your water heater install today?' — which dramatically increases response rate versus a generic 'rate us' blast.",
      },
      {
        icon: Mail,
        title: "Multi-Platform Collection",
        description:
          "Collect reviews on Google, Facebook, Trustpilot, or your own site. Route customers to the platform where you need the most social proof.",
      },
      {
        icon: CalendarCheck,
        title: "Smart Follow-Ups",
        description:
          "No response after 3 days? Fieseros sends a gentle nudge. Still nothing? It stops — no spammy repeat texts. Respect for your customers' inbox.",
      },
      {
        icon: FileText,
        title: "Review Dashboard",
        description:
          "See every review across every platform in one dashboard. Respond to Google reviews directly from Fieseros. Track your average rating and review velocity over time.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Job completes",
        description:
          "Tech marks the job 'Complete' in the mobile app. The customer gets an SMS within 60 seconds asking how the service was.",
      },
      {
        step: "2",
        title: "Sentiment check",
        description:
          "Customer taps 1-5 stars. 4-5 stars route to Google Reviews. 1-3 stars route to a private feedback form that goes to your inbox.",
      },
      {
        step: "3",
        title: "Review posted",
        description:
          "Happy customers land on your Google Business Profile and post their review. Your local SEO ranking climbs with each new 5-star review.",
      },
      {
        step: "4",
        title: "Respond + monitor",
        description:
          "New reviews appear in your dashboard. You respond publicly to positive reviews and follow up privately with the unhappy ones — all from one screen.",
      },
    ],
    painPoints: [
      {
        problem: "You do great work but have 6 Google reviews while competitors have 200.",
        fieserosSolution:
          "Automated, job-specific review requests collect 4.2x more reviews than manual asks. Customers post when the great service is fresh — not a week later when they've forgotten.",
      },
      {
        problem: "One angry customer tanks your rating with a public 1-star review before you can fix it.",
        fieserosSolution:
          "Sentiment-based routing sends unhappy customers to a private feedback form first. You get the chance to make it right before they ever reach Google Reviews.",
      },
      {
        problem: "You ask for reviews in person but customers forget by the time they're home.",
        fieserosSolution:
          "The request fires automatically the moment the job is marked complete — in the customer's hand, while the great service is still top of mind.",
      },
    ],
    faqs: [
      {
        question: "Does this work with my existing Google Business Profile?",
        answer:
          "Yes. Fieseros links to your Google Business Profile review URL. Customers tap the link and land directly on the review form — no searching, no friction. It works the same for Facebook, Trustpilot, and other platforms.",
      },
      {
        question: "Can customers opt out of review requests?",
        answer:
          "Yes. Customers can reply STOP to opt out of all SMS, and you can exclude specific customers from review requests (e.g., a particularly difficult one) from their CRM record.",
      },
      {
        question: "What if a customer leaves a bad review anyway?",
        answer:
          "Negative reviews appear in your dashboard immediately so you can respond fast. Fieseros suggests an AI-drafted public response and routes the customer's contact info to you for a private follow-up.",
      },
      {
        question: "How many review requests are too many?",
        answer:
          "Fieseros only sends one request per completed job and a single follow-up after 3 days — never spammy repeat texts. You can configure the timing and frequency per service type.",
      },
    ],
    relatedUseCases: [
      { label: "Lead Nurturing", href: "/use-cases/lead-nurturing" },
      { label: "Appointment Booking", href: "/use-cases/appointment-booking" },
      { label: "Customer Support", href: "/use-cases/customer-support" },
    ],
  },
  {
    slug: "lead-nurturing",
    titleTag: "Lead Nurturing & Automated Follow-Up Software | Fieseros",
    h1: "Nurture cold leads until they're ready to buy",
    eyebrow: "Use Case · Lead Nurturing",
    metaDescription:
      "Fieseros lead nurturing sends automated SMS + email sequences to cold leads over weeks. AI personalizes timing and content, re-engaging tire-kickers until they convert — without manual chasing.",
    heroSubtitle:
      "Not every lead is ready today. Automated nurture sequences keep your business top-of-mind for weeks — sending the right message at the right time — so when they ARE ready, you're the one they call.",
    icon: Mail,
    metrics: [
      { value: "+22%", label: "Of cold leads convert later" },
      { value: "Auto", label: "Personalized timing" },
      { value: "Multi-step", label: "SMS + email sequences" },
    ],
    features: [
      {
        icon: Mail,
        badge: "Automated",
        title: "Multi-Step Sequences",
        description:
          "Build nurture sequences across SMS and email — a tip on day 1, a case study on day 3, a special offer on day 7. Each step fires automatically based on the lead's behavior.",
      },
      {
        icon: Target,
        title: "Behavior-Based Branching",
        description:
          "If a lead opens an email but doesn't book, they get a different next message than one who ignored it. Branching logic adapts to engagement, not a one-size-fits-all blast.",
      },
      {
        icon: MessageSquare,
        badge: "AI",
        title: "AI-Drafted Content",
        description:
          "The AI drafts nurture messages in your brand voice — seasonal tips, limited-time offers, case studies — so you're not staring at a blank screen every week.",
      },
      {
        icon: CalendarCheck,
        title: "Smart Send Timing",
        description:
          "Messages send at the lead's local optimal time — not 3am. Fieseros learns when each contact tends to engage and schedules accordingly.",
      },
      {
        icon: CreditCard,
        title: "Re-Engagement Offers",
        description:
          "Trigger a 'we miss you' discount after 30 days of inactivity. Track which offers convert and double down on what works.",
      },
      {
        icon: FileText,
        title: "Full Conversation History",
        description:
          "Every nurture touch — SMS, email, chat — is logged on the lead's record. When they finally call to book, you have full context, not a cold start.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Lead enters nurture",
        description:
          "A cold lead (no urgency, no budget yet) is tagged 'Warm' and enrolled in your 14-day nurture sequence automatically.",
      },
      {
        step: "2",
        title: "Automated touches",
        description:
          "Day 1: a helpful tip. Day 3: a case study. Day 7: a limited-time offer. Day 14: a final nudge. Each fires on the lead's local time.",
      },
      {
        step: "3",
        title: "Behavior branching",
        description:
          "Lead opens the case study? They get a related how-to next. Lead ignores everything? They move to a slower monthly cadence. AI adapts.",
      },
      {
        step: "4",
        title: "Conversion",
        description:
          "Lead replies 'actually yes, can you come Thursday?' — Fieseros flags them Hot, alerts the owner, and creates the booking.",
      },
    ],
    painPoints: [
      {
        problem: "Cold leads die in your inbox because nobody has time to follow up 5 times.",
        fieserosSolution:
          "Automated multi-step sequences follow up with every cold lead on your behalf — for days or weeks — so the 22% who would've converted eventually actually do.",
      },
      {
        problem: "Generic 'just checking in' texts annoy leads more than they convert.",
        fieserosSolution:
          "AI drafts helpful, content-rich messages — seasonal tips, case studies, real value — not nagging check-ins. Branching adapts to what each lead engages with.",
      },
      {
        problem: "You can't tell which follow-up message actually drove the booking.",
        fieserosSolution:
          "Every touch is tracked. Fieseros attributes the conversion to the specific message that triggered the reply, so you know what's working and what to double down on.",
      },
    ],
    faqs: [
      {
        question: "How is this different from a regular email marketing tool?",
        answer:
          "Fieseros nurture is built for service businesses — it ties directly to the lead's CRM record, job history, and booking flow. When a lead replies, it routes to your team instantly and creates a booking, not just an email open metric.",
      },
      {
        question: "Can I customize the nurture sequence?",
        answer:
          "Yes. You can build any multi-step sequence with branching logic, custom timing, and conditional offers. Start from a template (seasonal, re-engagement, new lead) and tailor the messages to your trade and brand voice.",
      },
      {
        question: "Does it work over SMS as well as email?",
        answer:
          "Yes. SMS has a 98% open rate vs 20% for email — Fieseros uses both in sequence. SMS is great for short, high-urgency touches; email is better for longer content like case studies.",
      },
      {
        question: "What happens when a nurtured lead finally converts?",
        answer:
          "The moment a lead replies or books, Fieseros re-tags them Hot, alerts the owner via SMS + push, and creates the booking or job. The nurture sequence stops automatically so they don't get marketing messages after they're a customer.",
      },
    ],
    relatedUseCases: [
      { label: "Lead Capture", href: "/use-cases/lead-capture" },
      { label: "Review Collection", href: "/use-cases/review-collection" },
      { label: "Customer Support", href: "/use-cases/customer-support" },
    ],
  },
  {
    slug: "customer-support",
    titleTag: "AI Customer Support for Field Service | Fieseros",
    h1: "Answer every customer question — instantly, 24/7",
    eyebrow: "Use Case · Customer Support",
    metaDescription:
      "Fieseros AI customer support answers FAQs, handles reschedules, and troubleshoots issues 24/7 via chat, SMS, and voice. Escalate to humans only when needed — slash response times, boost CSAT.",
    heroSubtitle:
      "Customers hate waiting on hold. The AI support agent answers common questions, handles reschedules and cancellations, and troubleshoots basic issues — over chat, SMS, or voice — and escalates to a human only when it can't resolve it itself.",
    icon: MessageSquare,
    metrics: [
      { value: "<10s", label: "Avg first response time" },
      { value: "73%", label: "Resolved without a human" },
      { value: "+18", label: "CSAT points" },
    ],
    features: [
      {
        icon: MessageSquare,
        badge: "AI",
        title: "Conversational Support Agent",
        description:
          "The AI agent handles FAQs, status checks ('where's my tech?'), reschedules, and basic troubleshooting — over chat, SMS, and voice — 24/7, in your brand voice.",
      },
      {
        icon: FileText,
        title: "Knowledge Base Integration",
        description:
          "The agent answers from your uploaded knowledge base — service FAQs, warranty policies, how-to guides — so answers are always accurate and on-brand.",
      },
      {
        icon: Target,
        title: "Smart Escalation",
        description:
          "When the AI can't resolve an issue — a billing dispute, a complex technical problem — it hands off to a human with full context, not a cold transfer.",
      },
      {
        icon: CalendarCheck,
        title: "Self-Service Reschedules",
        description:
          "Customers reschedule, cancel, or check appointment status without calling — the AI updates the calendar and notifies the tech in real time.",
      },
      {
        icon: Mail,
        title: "Multi-Channel Inbox",
        description:
          "Chat, SMS, email, and voice all land in one shared inbox. Your team sees the full conversation history regardless of which channel the customer used.",
      },
      {
        icon: Star,
        title: "Post-Resolution Surveys",
        description:
          "Every resolved ticket triggers a CSAT survey. The AI routes unhappy customers to a manager before they post a public review.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Customer reaches out",
        description:
          "Via chat, SMS, email, or phone. The AI agent greets them and asks how it can help — in your brand voice, 24/7.",
      },
      {
        step: "2",
        title: "AI resolves or escalates",
        description:
          "73% of queries — FAQs, status, reschedules — are resolved by the AI in seconds. Complex issues escalate to a human with full context.",
      },
      {
        step: "3",
        title: "Human takes over",
        description:
          "If escalated, a team member gets a push notification with the full transcript and customer history. They pick up where the AI left off — no repeating.",
      },
      {
        step: "4",
        title: "Survey + close",
        description:
          "Ticket resolved triggers a CSAT survey. Happy customers get a review request; unhappy ones get routed to a manager for a save call.",
      },
    ],
    painPoints: [
      {
        problem: "Customers wait on hold for 15 minutes to ask 'where's my technician?'",
        fieserosSolution:
          "The AI agent answers status, reschedule, and FAQ queries in under 10 seconds, 24/7. Customers never wait on hold for a question the AI can answer.",
      },
      {
        problem: "Your support team answers the same 5 questions all day long.",
        fieserosSolution:
          "The AI handles the repetitive 73% — 'what are your hours?', 'how do I reset my thermostat?', 'reschedule my appointment' — freeing your team for the complex issues that actually need a human.",
      },
      {
        problem: "Support context lives in three inboxes and nobody has the full picture.",
        fieserosSolution:
          "Chat, SMS, email, and voice all land in one inbox tied to the customer's CRM record. Anyone on your team can pick up any conversation with full history.",
      },
    ],
    faqs: [
      {
        question: "How does the AI know the answers to customer questions?",
        answer:
          "The agent is trained on your knowledge base — FAQs, service policies, warranty terms, how-to guides. You upload documents or paste URLs and the AI learns. It only answers from approved sources, so it never makes things up.",
      },
      {
        question: "What happens when the AI can't resolve an issue?",
        answer:
          "The AI escalates to a human teammate with the full conversation transcript, customer history, and a summary of what it tried. Your team picks up seamlessly — no customer ever has to repeat themselves.",
      },
      {
        question: "Can the AI handle angry customers appropriately?",
        answer:
          "The AI detects frustration in language and tone, and escalates immediately to a human with a priority flag. It never argues or makes promises — it de-escalates and hands off. You approve the escalation routing.",
      },
      {
        question: "Does this work over phone calls too?",
        answer:
          "Yes. The AI Voice Receptionist answers calls, handles FAQs, takes messages, books appointments, and escalates to a human when needed — all with natural-sounding speech. Chat, SMS, and voice share the same knowledge base.",
      },
    ],
    relatedUseCases: [
      { label: "Review Collection", href: "/use-cases/review-collection" },
      { label: "Lead Capture", href: "/use-cases/lead-capture" },
      { label: "Appointment Booking", href: "/use-cases/appointment-booking" },
    ],
  },
  {
    slug: "job-dispatch",
    titleTag: "Smart Job Dispatch & Route Optimization Software | Fieseros",
    h1: "Dispatch the right tech, on the optimal route",
    eyebrow: "Use Case · Job Dispatch",
    metaDescription:
      "Fieseros smart dispatch assigns jobs by technician skill, territory, and availability — then optimizes the route to minimize drive time. Live GPS tracking, ETAs, and real-time re-routing for emergencies.",
    heroSubtitle:
      "Stop dispatching on a whiteboard. Fieseros auto-assigns each job to the right tech based on skill, territory, and route, then optimizes the day's drive order — saving fuel, time, and your customers' patience.",
    icon: Route,
    metrics: [
      { value: "-28%", label: "Drive time per day" },
      { value: "+5", label: "Jobs per tech per week" },
      { value: "Live", label: "GPS + ETA tracking" },
    ],
    features: [
      {
        icon: Route,
        badge: "AI",
        title: "Smart Assignment",
        description:
          "Each job auto-assigns to the best-fit technician based on skill, territory, certifications, and current load — not just whoever's 'free'.",
      },
      {
        icon: Target,
        title: "Route Optimization",
        description:
          "Fieseros re-orders the day's stops to minimize drive time and fuel — the same 8 jobs done in 5 hours instead of 7, with turn-by-turn directions.",
      },
      {
        icon: CalendarCheck,
        title: "Live ETA to Customer",
        description:
          "Customers get a live 'your tech is 12 minutes away' SMS with a map link — no more 'sometime between 8 and noon' windows.",
      },
      {
        icon: MessageSquare,
        title: "Emergency Re-Routing",
        description:
          "A burst pipe call comes in. Fieseros shows the closest qualified tech, reroutes their day, and notifies the customers whose appointments shifted.",
      },
      {
        icon: Mail,
        title: "Mobile PWA for Techs",
        description:
          "Techs get their optimized route, job details, customer history, and turn-by-turn navigation in one mobile app — works offline, syncs when back online.",
      },
      {
        icon: FileText,
        title: "Dispatch Board Overview",
        description:
          "See every tech's live location, current job, and next stop on one map-based dispatch board. Drag-and-drop to reassign when plans change.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Job comes in",
        description:
          "A booking, an emergency call, or a follow-up — every job lands on the dispatch board with the required skill and service area.",
      },
      {
        step: "2",
        title: "Auto-assigned",
        description:
          "Fieseros matches the job to the best tech — skill match, territory, current load — and slots it into their route at the optimal position.",
      },
      {
        step: "3",
        title: "Route optimized",
        description:
          "The day's stops are re-ordered to minimize drive time. The tech sees the optimized route with navigation in the mobile app.",
      },
      {
        step: "4",
        title: "Live + adaptable",
        description:
          "Customers get live ETAs. Emergencies trigger instant re-routing. The dispatch board shows it all in real time.",
      },
    ],
    painPoints: [
      {
        problem: "You dispatch on a whiteboard and your techs drive 3 hours a day between jobs.",
        fieserosSolution:
          "Route optimization re-orders stops to cut drive time by up to 28%. Techs fit 5 more jobs a week into the same hours — pure revenue lift.",
      },
      {
        problem: "Customers rage when the tech is 2 hours late with no heads-up.",
        fieserosSolution:
          "Live ETA SMS with a map link sets expectations before the customer has to ask. When traffic delays the tech, the ETA updates automatically.",
      },
      {
        problem: "Emergency calls blow up your whole day's schedule.",
        fieserosSolution:
          "Fieseros shows the closest qualified tech, reroutes their day in one click, and auto-notifies the customers whose appointments shifted — no phone tree, no chaos.",
      },
    ],
    faqs: [
      {
        question: "Does route optimization work for multi-tech teams?",
        answer:
          "Yes. Fieseros optimizes routes per technician and across the team — balancing load, minimizing total drive time, and respecting each tech's territory and skills. You can lock certain jobs to specific techs (e.g., a recurring customer) and let the optimizer handle the rest.",
      },
      {
        question: "What if a tech calls in sick or a job runs long?",
        answer:
          "Drag-and-drop reassignment on the dispatch board, or let Fieseros auto-reassign affected jobs to available techs. Customers whose appointments shift get an automated SMS with the new ETA — no manual calls.",
      },
      {
        question: "Does the customer see the tech's live location?",
        answer:
          "Yes — if you enable it. Customers get a secure map link showing the tech's live location and ETA, similar to Uber. You can disable live tracking for privacy-sensitive jobs and still send scheduled ETA windows.",
      },
      {
        question: "Can techs work offline in the field?",
        answer:
          "Yes. The mobile PWA caches job details, customer history, and forms for offline use. Photos, signatures, and job updates sync automatically when the tech reconnects — no lost data in dead zones.",
      },
    ],
    relatedUseCases: [
      { label: "Appointment Booking", href: "/use-cases/appointment-booking" },
      { label: "Lead Capture", href: "/use-cases/lead-capture" },
      { label: "Payment Collection", href: "/use-cases/payment-collection" },
    ],
  },
];

export function getUseCaseBySlug(slug: string): UseCaseConfig | undefined {
  return useCases.find((u) => u.slug === slug);
}
