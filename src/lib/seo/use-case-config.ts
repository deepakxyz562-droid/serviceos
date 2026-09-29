import {
  Target,
  CalendarCheck,
  Calculator,
  CreditCard,
  Star,
  Mail,
  MessageSquare,
  Route,
  Bot,
  Zap,
  ShieldCheck,
  Clock,
  Sparkles,
  Users,
  Smartphone,
  CheckCircle2,
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
    titleTag: "AI Lead Capture & Qualification Agent | GPTForm by Fieseros",
    h1: "Turn website visitors into qualified leads 24/7 with conversational AI",
    eyebrow: "Use Case · Lead Capture & Qualification",
    metaDescription:
      "GPTForm AI Agent engages every website visitor 24/7, asks qualifying questions, and captures verified contact details. Deliver 3.4x higher conversion than static web forms.",
    heroSubtitle:
      "Static contact forms cause visitors to bounce. GPTForm AI Agent greets visitors naturally, answers their questions from your website content, qualifies budget and urgency, and delivers sales-ready leads straight into your CRM.",
    icon: Target,
    metrics: [
      { value: "3.4x", label: "Higher lead conversion vs static forms" },
      { value: "<10s", label: "Instant response time 24/7" },
      { value: "100%", label: "Verified & structured lead data" },
    ],
    features: [
      {
        icon: MessageSquare,
        badge: "Conversational Intake",
        title: "Dialogue-Driven Lead Capture",
        description:
          "Instead of intimidating visitors with a 12-field form, your AI agent has a natural dialogue. It asks questions one by one, adapts based on visitor answers, and captures structured contact data effortlessly.",
      },
      {
        icon: Target,
        badge: "Smart Qualification",
        title: "Intelligent Lead Scoring",
        description:
          "Every inquiry is scored against your ideal client criteria — budget, timeline, service requirement, and location. High-value leads trigger instant SMS alerts; exploratory visitors enter a nurture flow.",
      },
      {
        icon: Bot,
        badge: "Dual-Brain RAG",
        title: "Zero-Hallucination Answers",
        description:
          "Trained on your website URLs, PDFs, and documentation. The agent answers visitor questions with strict factual grounding before asking for contact info — earning trust before asking for the conversion.",
      },
      {
        icon: Zap,
        title: "Dual Embed Modes",
        description:
          "Deploy as a modern floating chat widget in the bottom corner of your site, or embed inline as an interactive full-page conversational form anywhere using a simple 1-line snippet.",
      },
      {
        icon: Mail,
        title: "Multi-Channel Alert Dispatch",
        description:
          "The moment a high-intent lead finishes the conversation, instant notifications route to your sales team via SMS, email, WhatsApp, and Slack with the full qualification transcript.",
      },
      {
        icon: ShieldCheck,
        title: "Knowledge Gaps Discovery",
        description:
          "Whenever a prospect asks a question outside your current knowledge base, it's flagged in your Knowledge Gaps queue. Answer it once, and the AI agent knows it permanently.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Visitor Arrives & Engages",
        description:
          "A prospective client lands on your website. Rather than hunting through menus, they ask a question in the chat or click your embedded smart form.",
      },
      {
        step: "2",
        title: "AI Answers & Qualifies",
        description:
          "The agent provides an accurate, branded answer from your knowledge base, then naturally transitions: 'I can get our specialist to prepare an exact proposal — what is your estimated timeline?'",
      },
      {
        step: "3",
        title: "Data Extracted & Scored",
        description:
          "Contact info, service needs, budget, and urgency are parsed into structured CRM fields with zero manual data entry.",
      },
      {
        step: "4",
        title: "Instant Booking or Alert",
        description:
          "High-intent prospects are offered an immediate live calendar booking slot or routed to your on-duty sales rep within seconds.",
      },
    ],
    painPoints: [
      {
        problem: "Up to 80% of website visitors bounce because long static contact forms feel like tedious paperwork.",
        fieserosSolution:
          "GPTForm turns form filling into a friendly, 30-second conversation. Visitors ask questions first and provide their details naturally, boosting conversions by up to 3.4x.",
      },
      {
        problem: "Leads arriving after business hours wait 12+ hours for an email reply and book with the first competitor who responds.",
        fieserosSolution:
          "Your AI Agent responds in under 10 seconds 24/7/365, qualifying leads and locking in appointments while your competitors are asleep.",
      },
      {
        problem: "Your sales team spends half their day calling unqualified tire-kickers with insufficient budget.",
        fieserosSolution:
          "Automated qualification scores every prospect upfront. Your team only spends phone time with pre-qualified, ready-to-buy clients.",
      },
    ],
    faqs: [
      {
        question: "How does the AI lead capture agent know what questions to ask?",
        answer:
          "You define your qualification criteria in plain English or select from 20,000+ pre-built industry templates. The AI agent asks about required services, timeline, budget, location, and specific project details, adapting follow-ups dynamically.",
      },
      {
        question: "Can it crawl my existing website to learn about my business?",
        answer:
          "Yes! Simply enter your website URL, and GPTForm automatically crawls your pages, FAQs, blog articles, and service documentation. It indexes the content in minutes so the agent answers with complete accuracy from day one.",
      },
      {
        question: "How do I embed the lead capture agent on my site?",
        answer:
          "You paste a single line of JavaScript into your website header or CMS (WordPress, Shopify, Wix, Webflow, Squarespace, or custom HTML). It loads asynchronously with zero impact on page load speed or Core Web Vitals.",
      },
      {
        question: "What happens when a lead is captured?",
        answer:
          "The lead is instantly stored in your Fieseros CRM with a full conversation transcript and lead score. It can also sync immediately to your existing tools via Zapier, webhooks, or native integrations, while firing instant SMS/Slack alerts.",
      },
    ],
    relatedUseCases: [
      { label: "Appointment Booking", href: "/use-cases/appointment-booking" },
      { label: "Quote Generation", href: "/use-cases/quote-generation" },
      { label: "Customer Support", href: "/use-cases/customer-support" },
    ],
  },
  {
    slug: "appointment-booking",
    titleTag: "Autonomous AI Appointment Booking & Scheduling | GPTForm",
    h1: "Let customers book appointments directly in chat or forms",
    eyebrow: "Use Case · Appointment Booking & Scheduling",
    metaDescription:
      "GPTForm AI Agent books appointments 24/7 with real-time 2-way Google Calendar and Outlook sync. Eliminates phone tag and slashes no-shows with automated reminders.",
    heroSubtitle:
      "Customers want to book the moment they make a decision. GPTForm AI Agent checks live availability, displays real-time calendar slots, collects deposits, and sends instant confirmations — right inside the conversation or on-page form.",
    icon: CalendarCheck,
    metrics: [
      { value: "68%", label: "Of appointments booked after hours" },
      { value: "-45%", label: "Fewer no-shows with SMS reminders" },
      { value: "Real-time", label: "2-way Google & Outlook sync" },
    ],
    features: [
      {
        icon: CalendarCheck,
        badge: "Self-Service",
        title: "In-Chat Interactive Calendar Picker",
        description:
          "Customers pick dates and times from a slick, interactive calendar card embedded right in the chat flow — no external redirects to Calendly or third-party booking pages.",
      },
      {
        icon: Zap,
        badge: "2-Way Sync",
        title: "Bidirectional Calendar Availability",
        description:
          "Syncs with Google Calendar and Microsoft Outlook in real time. Personal appointments and blocked hours automatically remove slots, completely preventing double-bookings.",
      },
      {
        icon: CreditCard,
        title: "Deposit & Pre-Payment Collection",
        description:
          "Protect against no-shows by collecting a booking deposit or upfront fee via Stripe, Apple Pay, or credit card directly in the scheduling flow with 0% platform transaction fees.",
      },
      {
        icon: Mail,
        title: "Automated SMS & Email Reminders",
        description:
          "Automated reminders fire 24 hours and 1 hour before the scheduled time with 1-tap calendar links and reschedule options, slashing no-shows by up to 45%.",
      },
      {
        icon: Users,
        title: "Team & Territory Assignment",
        description:
          "Route bookings across multiple specialists or service technicians based on skill requirements, geographical territories, or round-robin availability.",
      },
      {
        icon: Clock,
        title: "Buffer Times & Scheduling Rules",
        description:
          "Configure custom buffer windows between appointments, minimum notice requirements, daily booking limits, and localized timezone detection.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Visitor Requests Booking",
        description:
          "During chat or form intake, the client indicates they want to schedule a consultation, estimate, or service appointment.",
      },
      {
        step: "2",
        title: "Live Slots Presented",
        description:
          "The AI agent queries your live Google/Outlook calendar and displays open, real-time slots tailored to the client's timezone.",
      },
      {
        step: "3",
        title: "Deposit & Details Captured",
        description:
          "The client chooses a slot, confirms contact information, and pays an optional booking deposit via Stripe or Apple Pay.",
      },
      {
        step: "4",
        title: "Calendar Locked & Synced",
        description:
          "Both customer and your team receive instant calendar invites with Google Meet/Zoom links and automated confirmation reminders.",
      },
    ],
    painPoints: [
      {
        problem: "Playing endless phone tag and trading 6 emails back and forth just to confirm a 30-minute consultation.",
        fieserosSolution:
          "Clients self-schedule in 30 seconds directly from your website, chat widget, or landing page with zero staff overhead.",
      },
      {
        problem: "Costly no-shows leave empty gaps in your team's calendar and waste valuable billable hours.",
        fieserosSolution:
          "Automated SMS/email reminders with 1-tap confirmation and optional booking deposits reduce no-shows by up to 45%.",
      },
      {
        problem: "Double-bookings happen when staff forget to manually update external scheduling spreadsheets.",
        fieserosSolution:
          "Instant bidirectional calendar sync guarantees that booked slots disappear immediately across Google Calendar and Outlook.",
      },
    ],
    faqs: [
      {
        question: "Does GPTForm integrate with Google Calendar and Microsoft Outlook?",
        answer:
          "Yes. GPTForm offers seamless two-way OAuth synchronization with Google Calendar and Microsoft Outlook. New bookings appear instantly on your calendar, and existing personal events block booking slots automatically.",
      },
      {
        question: "Can I collect a deposit when someone books an appointment?",
        answer:
          "Yes. You can require a fixed deposit, percentage, or full pre-payment at the time of booking via Stripe, Apple Pay, Google Pay, or PayPal. Fieseros charges 0% platform transaction fees on all payments.",
      },
      {
        question: "Can clients reschedule or cancel on their own?",
        answer:
          "Yes. Confirmation and reminder messages include secure self-service links that allow clients to reschedule or cancel within the policy window you define.",
      },
      {
        question: "Can it distribute bookings among multiple team members?",
        answer:
          "Yes. You can connect individual team calendars and route appointments based on staff specialization, territory coverage, or round-robin rotation.",
      },
    ],
    relatedUseCases: [
      { label: "Lead Capture", href: "/use-cases/lead-capture" },
      { label: "Payment Collection", href: "/use-cases/payment-collection" },
      { label: "Job Dispatch", href: "/use-cases/job-dispatch" },
    ],
  },
  {
    slug: "quote-generation",
    titleTag: "Instant AI Quote Generation & Price Calculator | GPTForm",
    h1: "Deliver instant, accurate estimates and dynamic quotes",
    eyebrow: "Use Case · Instant Quote Generation",
    metaDescription:
      "Generate instant estimates and quotes using GPTForm's conversational AI and visual formula engine. Deliver itemized pricing, collect e-signatures, and convert quotes to invoices.",
    heroSubtitle:
      "Stop losing deals to competitors who quote faster. GPTForm calculates dynamic price estimates in real time using your custom pricing formulas, displays interactive itemized breakdowns, and collects instant approvals with e-signatures.",
    icon: Calculator,
    metrics: [
      { value: "<2 min", label: "From customer request to sent quote" },
      { value: "+32%", label: "Higher quote acceptance rate" },
      { value: "100%", label: "Formula precision, zero hallucination" },
    ],
    features: [
      {
        icon: Calculator,
        badge: "Visual Formulas",
        title: "Dynamic Formula Calculation Engine",
        description:
          "Build multi-variable pricing formulas — square footage, material tiers, service hours, quantity discounts — that calculate exact numbers in real time with mathematical precision.",
      },
      {
        icon: Sparkles,
        badge: "AI Powered",
        title: "Conversational Scope Discovery",
        description:
          "The AI agent asks the right discovery questions to understand the scope of work, extracts dimensions and requirements, and feeds values directly into the calculation formula.",
      },
      {
        icon: MessageSquare,
        title: "Interactive 2-Column Estimate Cards",
        description:
          "Present quotes in beautiful, branded visual cards with line-item breakdowns, option toggles, and live price recalculation right inside the chat window.",
      },
      {
        icon: Target,
        title: "Good / Better / Best Tiered Options",
        description:
          "Empower prospects with multi-tier pricing choices. Presenting tiered options increases average deal size and boosts acceptance rates by over 30%.",
      },
      {
        icon: ShieldCheck,
        title: "Legally Binding E-Signatures",
        description:
          "Clients review the scope and sign directly on their smartphone or desktop. The signed contract is automatically stored in your CRM with full audit timestamps.",
      },
      {
        icon: CreditCard,
        title: "1-Tap Conversion to Invoice & Deposit",
        description:
          "Once a quote is signed, the system automatically creates the job record, generates the final invoice, and collects the initial project deposit via Stripe.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Prospect Defines Needs",
        description:
          "In chat or through an embedded calculator form, the customer specifies project scope, dimensions, selected materials, or service frequency.",
      },
      {
        step: "2",
        title: "Dynamic Calculation",
        description:
          "The formula engine instantly computes line items, labor, materials, and taxes using your strict pricebook logic — never guessing or hallucinating.",
      },
      {
        step: "3",
        title: "Visual Card Presentation",
        description:
          "The customer receives an interactive estimate card with options to adjust scope, add upgrades, or choose Good / Better / Best packages.",
      },
      {
        step: "4",
        title: "E-Sign & Deposit Locked",
        description:
          "The client signs on-screen and submits their deposit payment. An approved project record is instantly created in your workspace.",
      },
    ],
    painPoints: [
      {
        problem: "Spending evenings manually creating Word or PDF estimates while hot leads buy from faster competitors.",
        fieserosSolution:
          "Automated formula-driven quotes are generated in under 60 seconds while the prospect is still on your website and highly motivated.",
      },
      {
        problem: "Sales reps make manual math errors or give unauthorized discounts when estimating custom projects.",
        fieserosSolution:
          "Deterministic visual formulas enforce strict pricing rules, margins, and minimum charges without human calculation error.",
      },
      {
        problem: "Quotes get lost in email inboxes with zero visibility into whether the client opened or reviewed them.",
        fieserosSolution:
          "Real-time open tracking notifies your team when a client views the quote, triggering automated follow-up nudges at the ideal moment.",
      },
    ],
    faqs: [
      {
        question: "How does GPTForm calculate prices accurately without hallucinating?",
        answer:
          "GPTForm separates natural language conversation from numerical pricing. The AI gathers the project parameters, which are evaluated by a deterministic formula calculator engine according to your exact pricebook formulas.",
      },
      {
        question: "Can I create complex calculators with conditional rules?",
        answer:
          "Yes. You can configure formulas with conditional branches, square-foot multipliers, minimum base charges, volume discounts, and variable labor rates matching Jotform and Elementor calculator standards.",
      },
      {
        question: "Do customers need to download an app to sign the quote?",
        answer:
          "No. E-signatures work smoothly directly in the web browser on desktop, tablet, and mobile. Customers sign with their finger or mouse and receive a signed PDF confirmation immediately.",
      },
      {
        question: "Can the quote turn into a booked job and invoice automatically?",
        answer:
          "Yes. Upon client acceptance, the quote converts into an active job, syncs to your calendar, generates an invoice, and prompts for deposit payment in one seamless sequence.",
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
    titleTag: "In-Chat & On-Form Payment Collection (0% Platform Fees) | GPTForm",
    h1: "Collect deposits and payments directly inside conversations",
    eyebrow: "Use Case · Payment Collection",
    metaDescription:
      "Accept credit cards, Apple Pay, Google Pay, and ACH in-chat and on-form with 0% platform fees. Integrate Stripe, PayPal, Square, and 33+ global gateways with GPTForm.",
    heroSubtitle:
      "Remove checkout friction. GPTForm lets your clients pay booking deposits, settle invoices, or purchase service packages right inside the AI chat or embedded form — with 0% platform transaction fees.",
    icon: CreditCard,
    metrics: [
      { value: "0%", label: "Platform fees — keep 100% of your earnings" },
      { value: "33+", label: "Global payment gateways supported" },
      { value: "-65%", label: "Faster invoice payment collection (DSO)" },
    ],
    features: [
      {
        icon: CreditCard,
        badge: "0% Platform Fees",
        title: "Keep 100% of What You Earn",
        description:
          "Unlike other software that skim 1%–3% on top of payment processor rates, Fieseros charges 0% platform transaction fees. You only pay your standard gateway fees.",
      },
      {
        icon: Zap,
        badge: "In-Chat Checkout",
        title: "Frictionless In-Chat Payment Flow",
        description:
          "Customers complete payments without leaving the conversation. Apple Pay, Google Pay, credit cards, and ACH bank transfers render seamlessly in the chat stream.",
      },
      {
        icon: ShieldCheck,
        title: "33+ Global Payment Gateways",
        description:
          "Connect your preferred provider — Stripe, PayPal, Square, Razorpay, Authorize.net, Mollie, and 27 more. Route payments by geography, currency, or service category.",
      },
      {
        icon: CalendarCheck,
        title: "Mandatory Booking Deposits",
        description:
          "Require upfront deposits or credit card pre-authorizations before confirming appointments. Cut cancellations to near zero while securing cash flow.",
      },
      {
        icon: Mail,
        title: "Automated SMS Payment Reminders",
        description:
          "Unpaid balances trigger automated, polite SMS and email payment reminders with 1-tap mobile payment links. Average payment time drops from 28 days to under 48 hours.",
      },
      {
        icon: Smartphone,
        title: "On-Site & Mobile Tap-to-Pay",
        description:
          "Service technicians and field staff can collect payments on-site via smartphone tap-to-pay, card readers, or instant QR codes that update the CRM in real time.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Payment Requested",
        description:
          "During conversation, appointment booking, or upon quote acceptance, the AI triggers a secure payment card for the exact calculated balance or deposit.",
      },
      {
        step: "2",
        title: "1-Tap Checkout",
        description:
          "The customer taps Apple Pay, Google Pay, or enters their card details securely within the chat widget or embedded form.",
      },
      {
        step: "3",
        title: "Instant Confirmation",
        description:
          "Funds are processed directly into your connected Stripe/gateway account. Both customer and merchant receive instant itemized receipts.",
      },
      {
        step: "4",
        title: "Automatic Reconciliation",
        description:
          "The corresponding invoice and CRM deal are marked paid, and accounting data syncs automatically to QuickBooks or Xero.",
      },
    ],
    painPoints: [
      {
        problem: "Redirecting customers to clunky third-party payment portals leads to high cart and checkout abandonment.",
        fieserosSolution:
          "In-chat checkout with Apple Pay and 1-tap card entry keeps customers engaged and finishes transactions in seconds.",
      },
      {
        problem: "SaaS platforms charging 2%–5% extra transaction cuts eat into your gross profit margins.",
        fieserosSolution:
          "Fieseros charges 0% platform transaction fees. Your money goes directly from your gateway to your bank account.",
      },
      {
        problem: "Chasing late-paying clients with awkward phone calls and manual invoicing steals hours each week.",
        fieserosSolution:
          "Automated SMS/email payment nudges with 1-tap mobile pay links collect 65% of outstanding invoices within 48 hours.",
      },
    ],
    faqs: [
      {
        question: "Does Fieseros take a percentage fee on my transactions?",
        answer:
          "No. Fieseros charges 0% platform transaction fees. You keep 100% of your revenue, paying only your standard merchant processing fees directly to Stripe, PayPal, or your chosen gateway.",
      },
      {
        question: "Is in-chat payment collection secure and PCI compliant?",
        answer:
          "Yes. All payment fields are rendered using secure PCI-DSS Level 1 compliant tokenized iframes provided directly by Stripe and supported gateways. Sensitive card data never touches your servers.",
      },
      {
        question: "Can I collect recurring subscriptions or retainers?",
        answer:
          "Yes. You can configure recurring monthly or quarterly billing plans for maintenance contracts, memberships, or ongoing service retainers that auto-bill on schedule.",
      },
      {
        question: "What happens if a customer wants to pay by cash or check?",
        answer:
          "Field personnel can record offline payments (cash, check, bank transfer) directly on their mobile CRM app, immediately marking the invoice as paid and issuing a receipt.",
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
    titleTag: "Automated 5-Star Google Review Collection | GPTForm",
    h1: "Turn satisfied clients into 5-star Google reviews on autopilot",
    eyebrow: "Use Case · Review Collection & Reputation",
    metaDescription:
      "Automatically request 5-star Google, Trustpilot, and Facebook reviews after service delivery. Intelligent sentiment routing protects your public rating while boosting local SEO.",
    heroSubtitle:
      "88% of prospective customers consult online reviews before booking. GPTForm triggers personalized review requests the moment an appointment or service finishes, routing happy clients directly to Google to leave 5-star praise.",
    icon: Star,
    metrics: [
      { value: "+4.2x", label: "More Google reviews captured" },
      { value: "94%", label: "Sent within optimal 1-hour window" },
      { value: "4.9★", label: "Average public rating after sentiment filtering" },
    ],
    features: [
      {
        icon: Star,
        badge: "Automated Triggers",
        title: "Instant Post-Service Review Requests",
        description:
          "The moment an appointment is finished or a job is marked complete in your CRM, an automated SMS/email fires while the positive experience is fresh in the client's mind.",
      },
      {
        icon: ShieldCheck,
        badge: "Sentiment Gate",
        title: "Intelligent Sentiment Routing",
        description:
          "Customers rate their experience 1 to 5 stars. Happy clients (4–5 stars) are directed with 1 tap to your Google Business Profile. Critical feedback (1–3 stars) routes to private management review.",
      },
      {
        icon: MessageSquare,
        title: "Personalized Job-Specific Context",
        description:
          "Review requests reference the exact service provided — 'How did our technician do on your installation today?' — drastically increasing response rates compared to generic blasts.",
      },
      {
        icon: Zap,
        title: "Direct Google 1-Tap Deep Link",
        description:
          "No searching or navigating menus. The client taps the link and their native Google review window opens immediately with 5 stars pre-selected.",
      },
      {
        icon: Target,
        title: "Multi-Platform Social Proof",
        description:
          "Direct reviews to Google, Trustpilot, Facebook, Yelp, or your website testimonials based on where you need social proof the most.",
      },
      {
        icon: Mail,
        title: "Smart Non-Intrusive Follow-Ups",
        description:
          "If a customer doesn't respond after 3 days, a single gentle follow-up sends. If still no answer, the sequence halts automatically to protect your relationship.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Service Completed",
        description:
          "A job is marked complete or consultation ends. The automated reputation engine triggers immediately.",
      },
      {
        step: "2",
        title: "Sentiment Check",
        description:
          "The customer receives a friendly SMS: 'How was your experience today? Tap to rate 1-5 stars.'",
      },
      {
        step: "3",
        title: "Smart Routing",
        description:
          "Ratings of 4 or 5 stars open Google Reviews directly. Ratings of 1 to 3 stars route to an internal private feedback form.",
      },
      {
        step: "4",
        title: "SEO Rank Climbs",
        description:
          "New 5-star reviews post to Google Business Profile, accelerating local search rankings and attracting inbound organic leads.",
      },
    ],
    painPoints: [
      {
        problem: "You deliver exceptional service, but satisfied clients forget to leave a review once they walk away.",
        fieserosSolution:
          "Automated mobile SMS sent within 60 minutes captures customers when enthusiasm is at its absolute peak.",
      },
      {
        problem: "A single disgruntled customer posts a public 1-star rant that damages your local SEO and credibility.",
        fieserosSolution:
          "Smart sentiment filtering catches unhappy customers first, giving you the opportunity to resolve issues privately before public posting.",
      },
      {
        problem: "Asking for reviews manually feels awkward, inconsistent, and often forgotten by busy staff.",
        fieserosSolution:
          "100% automated triggers require zero manual effort from your team, consistently generating 4.2x more reviews.",
      },
    ],
    faqs: [
      {
        question: "Does this connect directly to my Google Business Profile?",
        answer:
          "Yes. Fieseros connects to your Google Business Profile review URL. When happy customers tap, it opens the Google review box instantly on their phone or desktop with zero friction.",
      },
      {
        question: "Can I collect reviews on other platforms like Trustpilot or Facebook?",
        answer:
          "Yes. You can route reviews to Google, Trustpilot, Facebook, or your own website testimonial widget, or alternate destinations to build social proof across multiple platforms.",
      },
      {
        question: "Can customers opt out of receiving review requests?",
        answer:
          "Yes. All SMS messages include standard opt-out commands (reply STOP to unsubscribe). You can also flag individual customer records in your CRM to exclude them from review campaigns.",
      },
      {
        question: "How do automated Google reviews help my local SEO?",
        answer:
          "Google's local search algorithm heavily weighs review velocity, recency, and average rating. Businesses consistently earning fresh 5-star reviews rank higher in the Google Maps Local Pack.",
      },
    ],
    relatedUseCases: [
      { label: "Customer Support", href: "/use-cases/customer-support" },
      { label: "Appointment Booking", href: "/use-cases/appointment-booking" },
      { label: "Lead Nurturing", href: "/use-cases/lead-nurturing" },
    ],
  },
  {
    slug: "lead-nurturing",
    titleTag: "Automated Lead Nurturing & Smart Follow-Up | GPTForm",
    h1: "Re-engage warm prospects and turn undecided visitors into buyers",
    eyebrow: "Use Case · Lead Nurturing & Follow-Ups",
    metaDescription:
      "Don't let warm leads go cold. GPTForm automates multi-channel SMS and email follow-up sequences, reviving dropped-off visitors with timely, personalized messages.",
    heroSubtitle:
      "Up to 70% of inbound leads don't purchase immediately. GPTForm keeps your business top-of-mind with intelligent, behavior-triggered SMS and email sequences that guide warm prospects back to booking.",
    icon: Mail,
    metrics: [
      { value: "+26%", label: "Higher lead-to-booking conversion rate" },
      { value: "98%", label: "SMS open rate vs 20% standard email" },
      { value: "100%", label: "Automated behavior-based triggers" },
    ],
    features: [
      {
        icon: Mail,
        badge: "Multi-Channel",
        title: "Omnichannel SMS & Email Sequences",
        description:
          "Combine high-urgency SMS with informative email touches. Day 1: a quick check-in; Day 3: a relevant case study; Day 7: a limited-time incentive.",
      },
      {
        icon: Target,
        badge: "Dynamic Logic",
        title: "Behavior-Based Branching",
        description:
          "Sequences adapt dynamically based on lead actions. If a prospect clicks a quote link, they receive a targeted booking offer rather than a generic follow-up.",
      },
      {
        icon: Bot,
        title: "AI-Drafted Personalized Copy",
        description:
          "GPTForm writes contextual follow-ups that reference the prospect's exact stated requirements and project details — never sounding like a canned mass broadcast.",
      },
      {
        icon: Clock,
        title: "Optimal Send-Time AI",
        description:
          "Messages fire at optimal daytime hours in the recipient's local timezone. The system learns when each lead typically responds to maximize engagement.",
      },
      {
        icon: ShieldCheck,
        title: "Instant Stop-on-Reply Protection",
        description:
          "The moment a prospect replies, schedules an appointment, or requests an agent, the automated sequence pauses instantly so they never receive irrelevant follow-ups.",
      },
      {
        icon: Zap,
        title: "Abandoned Chat & Form Recovery",
        description:
          "If a visitor starts answering questions in the chat or smart form but drops off midway, GPTForm fires a friendly reminder to complete their request.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Lead Enters Sequence",
        description:
          "A prospect receives a quote or completes intake but doesn't schedule immediately. They are tagged Warm and enrolled in the nurture campaign.",
      },
      {
        step: "2",
        title: "Automated Value Touches",
        description:
          "Helpful, non-pushy messages deliver relevant case studies, client testimonials, and seasonal advice directly via SMS and email.",
      },
      {
        step: "3",
        title: "Prospect Re-Engages",
        description:
          "The prospect replies to an SMS: 'Yes, we are ready to move forward. What days are open this week?'",
      },
      {
        step: "4",
        title: "Hot Lead Alert & Booking",
        description:
          "The sequence halts instantly. Fieseros alerts your team, marks the lead Hot, and provides a 1-tap booking confirmation.",
      },
    ],
    painPoints: [
      {
        problem: "Warm leads slip through the cracks because sales reps don't have time to manually follow up 5 times.",
        fieserosSolution:
          "Automated nurture sequences stay persistent for weeks without human effort, converting 26% of prospects who would have otherwise been lost.",
      },
      {
        problem: "Generic 'just checking in' emails feel spammy and get routinely ignored or deleted.",
        fieserosSolution:
          "AI personalizes every message around the prospect's actual project scope, delivering real value rather than empty check-ins.",
      },
      {
        problem: "Marketing sends promotional blasts to clients who have already booked or paid.",
        fieserosSolution:
          "Tight CRM integration automatically terminates nurture sequences the exact second a prospect books or completes payment.",
      },
    ],
    faqs: [
      {
        question: "How is GPTForm lead nurturing different from typical email marketing software?",
        answer:
          "Unlike generic email newsletter tools, GPTForm is an action-driven CRM engine. It combines high-conversion SMS with email, tracks live quote views, and automatically transitions leads into booked jobs the moment they reply.",
      },
      {
        question: "Can I customize the frequency and messaging of the sequences?",
        answer:
          "Yes. You can customize the delays, trigger conditions, content templates, and delivery channels for every step. Use our battle-tested templates or build bespoke workflows.",
      },
      {
        question: "What happens when a prospect texts back?",
        answer:
          "The automated sequence stops immediately. The AI agent can either handle the conversation autonomously or notify your team instantly for a live human operator takeover.",
      },
      {
        question: "Does it comply with SMS TCPA regulations?",
        answer:
          "Yes. GPTForm includes built-in consent capture checkboxes on forms, time-of-day sending safeguards, and automatic STOP opt-out processing.",
      },
    ],
    relatedUseCases: [
      { label: "Lead Capture", href: "/use-cases/lead-capture" },
      { label: "Quote Generation", href: "/use-cases/quote-generation" },
      { label: "Customer Support", href: "/use-cases/customer-support" },
    ],
  },
  {
    slug: "customer-support",
    titleTag: "24/7 AI Customer Support & FAQ Agent | GPTForm",
    h1: "Answer customer questions instantly with zero hallucinations",
    eyebrow: "Use Case · Customer Support & FAQ Agent",
    metaDescription:
      "Resolve 75%+ of customer inquiries instantly 24/7 with GPTForm's website-grounded AI agent. Dual-brain architecture eliminates hallucinations with 1-click human escalation.",
    heroSubtitle:
      "Stop losing clients to slow support response times. GPTForm AI Agent answers questions strictly from your website, documentation, and pricebooks — providing instant, accurate answers with citations and smooth human handoffs.",
    icon: MessageSquare,
    metrics: [
      { value: "<5s", label: "Instant first response time 24/7" },
      { value: "75%+", label: "Inquiries resolved without human intervention" },
      { value: "0%", label: "Hallucinations with Dual-Brain RAG" },
    ],
    features: [
      {
        icon: Bot,
        badge: "Zero Hallucination",
        title: "Dual-Brain Grounded RAG Architecture",
        description:
          "Unlike generic chatbots that guess, GPTForm checks factual confidence gates before answering. It answers strictly from verified knowledge sources, preventing made-up policies or prices.",
      },
      {
        icon: Sparkles,
        badge: "Auto Crawl",
        title: "Instant Website & Document Ingestion",
        description:
          "Paste your website URL, upload PDFs, policy documents, or paste FAQs. GPTForm automatically indexes all content and keeps your agent synchronized with your website updates.",
      },
      {
        icon: ShieldCheck,
        title: "Knowledge Gaps Review Queue",
        description:
          "Whenever a customer asks something where AI confidence is low, it is logged in your Knowledge Gaps inbox. Answer it once, and the AI agent learns it permanently for all future visitors.",
      },
      {
        icon: Users,
        title: "Seamless Live Operator Takeover",
        description:
          "When a query requires human touch, the agent transfers the visitor to your team with the full conversation transcript and CRM context. No customer ever has to repeat themselves.",
      },
      {
        icon: Smartphone,
        title: "Mobile Companion App Alerts",
        description:
          "Receive instant push notifications on iOS and Android when a customer requests a human agent or reports an urgent issue. Reply directly from your phone.",
      },
      {
        icon: Target,
        title: "Self-Service Action Execution",
        description:
          "The support agent does more than answer questions — it can check appointment status, reschedule bookings, update contact details, or process invoice payments right inside the chat.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Customer Inquires",
        description:
          "A customer asks: 'What is your cancellation policy, and can I reschedule my appointment for Friday?'",
      },
      {
        step: "2",
        title: "Confidence Gate Check",
        description:
          "The Dual-Brain engine retrieves the verified cancellation policy and queries live calendar slots for Friday.",
      },
      {
        step: "3",
        title: "Resolution in Seconds",
        description:
          "The AI explains the policy, presents open Friday slots, and reschedules the appointment directly within the conversation.",
      },
      {
        step: "4",
        title: "Knowledge Continuous Learning",
        description:
          "If any aspect of the question was new, it is added to your Knowledge Gaps queue so you can enrich the knowledge base in 1 click.",
      },
    ],
    painPoints: [
      {
        problem: "Support staff spend 4+ hours a day answering the exact same 15 routine questions over and over.",
        fieserosSolution:
          "The AI agent resolves over 75% of routine questions instantly, freeing your human team to focus on high-value client relationships.",
      },
      {
        problem: "Fear of AI chatbots hallucinating incorrect pricing, bogus discounts, or false company promises.",
        fieserosSolution:
          "Dual-Brain RAG architecture strictly restricts the agent to verified documentation. If it doesn't know, it honestly escalates to a human.",
      },
      {
        problem: "Visitors get frustrated with robotic chatbots that trap them in dead-end loops without human help.",
        fieserosSolution:
          "Visitors can request a human at any moment, immediately notifying your team on desktop and mobile with complete context.",
      },
    ],
    faqs: [
      {
        question: "How does GPTForm prevent AI hallucinations?",
        answer:
          "GPTForm uses a Dual-Brain architecture combining factual retrieval with semantic vector search. Every answer must pass strict confidence thresholds and cite indexed knowledge sources. If information is missing, the AI politely offers to escalate to your team.",
      },
      {
        question: "How long does it take to train the agent on my website?",
        answer:
          "Less than 60 seconds. You provide your website URL, and our crawler reads your pages, FAQs, and service descriptions automatically. You can also upload PDF manuals, pricebooks, or docx files anytime.",
      },
      {
        question: "What is the Knowledge Gaps queue?",
        answer:
          "The Knowledge Gaps queue is an automated learning inbox. Whenever a visitor asks a question the bot couldn't fully answer, it is recorded for you. You type or approve the answer once, and your agent knows it forever.",
      },
      {
        question: "Can human operators jump in and take over live chats?",
        answer:
          "Yes. Our desktop and mobile companion apps alert you immediately when a client needs human assistance. You can take over the chat with a single click, type your response, and hand it back to the AI when finished.",
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
    titleTag: "Smart Team Scheduling & Job Dispatch | GPTForm",
    h1: "Route qualified leads and dispatch jobs to the right team members",
    eyebrow: "Use Case · Team Routing & Job Dispatch",
    metaDescription:
      "Automatically assign qualified leads and bookings by territory, skill, and team availability. Eliminate dispatch friction and accelerate response times.",
    heroSubtitle:
      "Turn inbound leads into dispatched appointments without manual triage. GPTForm routes bookings to the right specialist or team member based on service type, location, and real-time calendar availability.",
    icon: Route,
    metrics: [
      { value: "<30s", label: "Average lead-to-dispatch assignment time" },
      { value: "+25%", label: "Team operational efficiency lift" },
      { value: "100%", label: "Automated rule-based lead distribution" },
    ],
    features: [
      {
        icon: Route,
        badge: "Smart Dispatch",
        title: "Territory & Skill-Based Auto-Assignment",
        description:
          "Automatically assign incoming jobs and consultations to the best-fit team member based on geographical service zones, technical skills, and current schedule capacity.",
      },
      {
        icon: CalendarCheck,
        badge: "Calendar Sync",
        title: "Per-Technician Real-Time Schedules",
        description:
          "Each team member maintains their own connected Google Calendar or Outlook. Bookings only route to staff who are on-duty and available at that specific time.",
      },
      {
        icon: Smartphone,
        title: "Mobile Push & SMS Staff Alerts",
        description:
          "Dispatched team members receive instant mobile alerts with complete customer background, service notes, address directions, and special instructions.",
      },
      {
        icon: Target,
        title: "Round-Robin & Priority Routing",
        description:
          "Distribute leads evenly across your sales team with round-robin rotation, or assign priority leads to your top-performing senior specialists first.",
      },
      {
        icon: Zap,
        title: "Live Customer ETA & Status Updates",
        description:
          "Keep clients informed with automated SMS notifications when a specialist is assigned, on route, or arriving — drastically improving customer satisfaction.",
      },
      {
        icon: CheckCircle2,
        title: "Drag-and-Drop Dispatch Board",
        description:
          "Administrators can view all scheduled jobs, reassign team members, and reschedule appointments on a clean, visual drag-and-drop dispatch calendar.",
      },
    ],
    workflow: [
      {
        step: "1",
        title: "Customer Books or Requests",
        description:
          "An inbound lead schedules an appointment or submits an urgent service request through chat or embedded form.",
      },
      {
        step: "2",
        title: "Smart Routing Evaluation",
        description:
          "The system checks service type, client location, staff skills, and real-time calendar availability in milliseconds.",
      },
      {
        step: "3",
        title: "Job Dispatched & Staff Alerted",
        description:
          "The job is assigned to the ideal team member, who gets an instant push notification on their phone with all job specifications.",
      },
      {
        step: "4",
        title: "Client Kept Informed",
        description:
          "The customer receives an automated confirmation with their assigned specialist's profile and scheduled arrival window.",
      },
    ],
    painPoints: [
      {
        problem: "Dispatchers spend hours juggling text messages, whiteboards, and spreadsheets to figure out who is available.",
        fieserosSolution:
          "Intelligent auto-routing matches jobs to available team members in seconds based on skills, territory, and live calendar sync.",
      },
      {
        problem: "Appointments get assigned to staff who are off-duty, double-booked, or in another quadrant of town.",
        fieserosSolution:
          "Real-time calendar verification checks each specialist's personal schedule and territory zones before any assignment is confirmed.",
      },
      {
        problem: "Customers left waiting with vague 'sometime between 8am and 5pm' arrival windows complain and cancel.",
        fieserosSolution:
          "Specific appointment slots and automated SMS status notifications keep customers informed and delighted every step of the way.",
      },
    ],
    faqs: [
      {
        question: "How does the auto-routing system choose who gets assigned each job?",
        answer:
          "You can configure routing rules based on service expertise, geographic zip codes or territories, working hours, and round-robin lead distribution to ensure fair and optimal allocation.",
      },
      {
        question: "Can team members connect their own Google Calendars?",
        answer:
          "Yes. Each team member connects their personal Google Calendar or Microsoft Outlook via OAuth. Their personal appointments automatically block out their availability for new bookings.",
      },
      {
        question: "Can an administrator manually override assignments?",
        answer:
          "Yes. The visual dispatch calendar gives managers full drag-and-drop control to reassign jobs, reschedule appointments, or adjust staff territories at any time.",
      },
      {
        question: "Does the system work for remote consultation teams as well as field staff?",
        answer:
          "Yes. It works equally well for virtual teams (auto-generating Google Meet/Zoom links for consults) and field service teams requiring physical travel and on-site scheduling.",
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
