import {
  Bot,
  Phone,
  Layers,
  DollarSign,
  Zap,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import type { Feature } from "@/components/seo/feature-grid";
import type { FaqItem } from "@/lib/seo/schemas";

export interface ComparisonRow {
  feature: string;
  fieseros: boolean;
  competitor: boolean;
  note: string;
}

export interface ComparisonConfig {
  /** URL slug, e.g. "fieseros-vs-typeform" or "ai-chatbot-alternatives". */
  slug: string;
  /** Competitor product name, or null for "alternatives" roundup pages. */
  competitorName: string | null;
  /** Pretty label used in the matrix column header, e.g. "Typeform". */
  competitorLabel: string;
  titleTag: string;
  h1: string;
  eyebrow: string;
  metaDescription: string;
  heroSubtitle: string;
  /** Feature-by-feature matrix rows. */
  matrix: ComparisonRow[];
  /** "Why switch" reasons — surfaced as feature cards. */
  whySwitch: Feature[];
  faqs: FaqItem[];
  /** Other comparison pages to cross-link at the bottom. */
  related: { label: string; href: string }[];
}

export const comparisons: ComparisonConfig[] = [
  {
    slug: "fieseros-vs-typeform",
    competitorName: "Typeform",
    competitorLabel: "Typeform",
    titleTag: "Fieseros vs Typeform (2026) — Why Service Businesses Switch",
    h1: "Fieseros vs Typeform: the 2026 comparison",
    eyebrow: "Compare · Typeform",
    metaDescription:
      "Detailed Fieseros vs Typeform comparison. See why service businesses choose Fieseros for AI chat agents, 24/7 voice receptionist, native CRM, dispatch, and 0% platform payment fees — not just pretty forms.",
    heroSubtitle:
      "Typeform makes beautiful one-question-at-a-time forms. Fieseros turns those forms into AI conversations that capture leads, book jobs, collect payments, and dispatch technicians — all in one platform. Here's the head-to-head.",
    matrix: [
      { feature: "Beautiful conversational forms", fieseros: true, competitor: true, note: "Both offer one-question-at-a-time conversational UI" },
      { feature: "AI chat agent on your website (24/7)", fieseros: true, competitor: false, note: "Typeform has no standalone AI chatbot agent" },
      { feature: "24/7 AI Voice Phone Receptionist", fieseros: true, competitor: false, note: "Fieseros answers phone calls and books jobs via voice" },
      { feature: "Native CRM + technician dispatch", fieseros: true, competitor: false, note: "Typeform requires Zapier + 3rd-party CRM" },
      { feature: "0% platform payment transaction fees", fieseros: true, competitor: false, note: "Typeform caps paid submissions; Fieseros charges 0% on top of gateway" },
      { feature: "33+ payment gateways", fieseros: true, competitor: true, note: "Stripe, PayPal, Square, Razorpay, Mollie, Authorize.net" },
      { feature: "1-click form → AI chatbot conversion", fieseros: true, competitor: false, note: "Fieseros converts any form into a slot-filling chat agent" },
      { feature: "Autonomous business actions (jobs, quotes, invoices)", fieseros: true, competitor: false, note: "Fieseros executes real operational actions, not just data collection" },
      { feature: "Lead scoring & smart routing", fieseros: true, competitor: false, note: "Fieseros scores leads and routes to the right technician" },
      { feature: "On-site payment + deposit collection", fieseros: true, competitor: false, note: "Tap-to-pay, deposits at booking, automated reminders" },
      { feature: "Mobile field app (PWA, offline)", fieseros: true, competitor: false, note: "Typeform is form-only; Fieseros includes a tech mobile app" },
      { feature: "Free tier with no platform payment fees", fieseros: true, competitor: false, note: "Fieseros free tier: 100 jobs, 0% platform fee" },
    ],
    whySwitch: [
      {
        icon: Bot,
        title: "AI agent, not just a form",
        description:
          "Typeform collects responses. Fieseros AI agent has a real conversation, qualifies leads, scores urgency, and books the appointment — turning a form into a sales rep that never sleeps.",
      },
      {
        icon: Phone,
        title: "Voice receptionist included",
        description:
          "Typeform can't answer your phone. Fieseros AI Voice Receptionist answers every call 24/7, triages emergencies, and books jobs — capturing the leads that call instead of clicking.",
      },
      {
        icon: Layers,
        title: "CRM + dispatch built in",
        description:
          "Stop paying for Typeform + HubSpot + Calendly + Zapier. Fieseros includes the CRM, scheduling, dispatch, and invoicing — one platform, one price, no integration glue.",
      },
      {
        icon: DollarSign,
        title: "0% platform payment fees",
        description:
          "Typeform caps paid submissions and charges platform fees. Fieseros charges 0% on top of the gateway fee — you keep more of every payment you collect.",
      },
      {
        icon: Zap,
        title: "Form → chatbot in one click",
        description:
          "Convert any Fieseros form into an AI chatbot that fills the same fields through conversation — no rebuilding. Typeform has no equivalent.",
      },
      {
        icon: ShieldCheck,
        title: "Built for field service",
        description:
          "Typeform is a general-purpose form tool. Fieseros is purpose-built for plumbers, HVAC, electricians, and trades — with job workflows, assets, and route optimization.",
      },
    ],
    faqs: [
      {
        question: "Can I migrate my Typeform forms to Fieseros?",
        answer:
          "Yes. Fieseros has an AI form generator that rebuilds any Typeform from a URL or description. Your conditional logic, question types, and branding are preserved. Most customers migrate in under an hour.",
      },
      {
        question: "Is Fieseros more expensive than Typeform?",
        answer:
          "It depends on your usage. Typeform charges per response and caps paid submissions. Fieseros charges a flat subscription with 0% platform payment fees. For businesses collecting payments through forms, Fieseros is typically cheaper once you factor in the saved transaction fees.",
      },
      {
        question: "Does Fieseros have conditional logic like Typeform?",
        answer:
          "Yes. Fieseros smart forms support full conditional logic — show/hide fields, branching, calculations, and skip rules. Plus the AI agent can adapt its questions based on answers dynamically, which Typeform cannot.",
      },
      {
        question: "What if I only need forms, not the full platform?",
        answer:
          "Fieseros has a standalone Forms product (Fieseros AI Forms) for businesses that just want AI forms + chatbot without the field-service CRM. You can start with Forms and upgrade to the full platform anytime.",
      },
    ],
    related: [
      { label: "Fieseros vs Chatbase", href: "/fieseros-vs-chatbase" },
      { label: "Fieseros vs Tidio", href: "/fieseros-vs-tidio" },
      { label: "AI Chatbot Alternatives", href: "/ai-chatbot-alternatives" },
    ],
  },
  {
    slug: "fieseros-vs-chatbase",
    competitorName: "Chatbase",
    competitorLabel: "Chatbase",
    titleTag: "Fieseros vs Chatbase (2026) — Beyond Chatbot Builders",
    h1: "Fieseros vs Chatbase: beyond the chatbot",
    eyebrow: "Compare · Chatbase",
    metaDescription:
      "Detailed Fieseros vs Chatbase comparison. Chatbase builds chatbots; Fieseros turns conversations into booked jobs, paid invoices, and dispatched technicians — with native CRM and 24/7 voice.",
    heroSubtitle:
      "Chatbase is a great chatbot builder. Fieseros is the operating system those chatbots feed. Conversations become booked jobs, paid invoices, and dispatched technicians — all in one platform, no Zapier glue.",
    matrix: [
      { feature: "AI chatbot trained on your data", fieseros: true, competitor: true, note: "Both train on URLs, docs, and knowledge bases" },
      { feature: "Smart forms with 200+ widgets", fieseros: true, competitor: false, note: "Chatbase is chat-only; Fieseros includes a full form builder" },
      { feature: "Native CRM + customer history", fieseros: true, competitor: false, note: "Chatbase has no CRM; conversations live in isolation" },
      { feature: "24/7 AI Voice Phone Receptionist", fieseros: true, competitor: false, note: "Fieseros answers phone calls, not just chat" },
      { feature: "Job scheduling + technician dispatch", fieseros: true, competitor: false, note: "Chatbase can't book or dispatch a job" },
      { feature: "Invoicing + payment collection (33 gateways)", fieseros: true, competitor: false, note: "Chatbase can't collect payments or send invoices" },
      { feature: "0% platform payment transaction fees", fieseros: true, competitor: false, note: "Fieseros charges 0% on top of gateway fees" },
      { feature: "Lead scoring + smart routing", fieseros: true, competitor: false, note: "Fieseros scores and routes leads; Chatbase just answers" },
      { feature: "Conversational booking (self-schedule)", fieseros: true, competitor: false, note: "Fieseros agent books appointments in-chat; Chatbase cannot" },
      { feature: "Mobile field PWA (offline)", fieseros: true, competitor: false, note: "Chatbase has no field technician app" },
      { feature: "Autonomous business actions", fieseros: true, competitor: false, note: "Fieseros creates jobs, quotes, invoices — not just chat replies" },
      { feature: "Embed on any site (WordPress, Shopify, Wix)", fieseros: true, competitor: true, note: "Both offer embeddable chat widgets" },
    ],
    whySwitch: [
      {
        icon: Bot,
        title: "Chatbot → business action",
        description:
          "Chatbase answers questions. Fieseros AI agent captures the lead, books the appointment, collects the deposit, and dispatches the technician — turning chat into revenue, not just replies.",
      },
      {
        icon: Layers,
        title: "CRM that knows the customer",
        description:
          "Chatbase conversations live in isolation. Fieseros ties every chat to a CRM record with full history — past jobs, invoices, assets — so the agent (and your team) always has context.",
      },
      {
        icon: Phone,
        title: "Voice, not just chat",
        description:
          "Chatbase is chat-only. Fieseros includes a 24/7 AI Voice Receptionist that answers phone calls, triages emergencies, and books jobs — capturing the leads that call instead of chat.",
      },
      {
        icon: CreditCard,
        title: "Payments built in",
        description:
          "Chatbase can't collect a dollar. Fieseros collects deposits, sends invoices, and reconciles payments across 33 gateways — the full revenue loop in one platform.",
      },
      {
        icon: DollarSign,
        title: "One platform, one price",
        description:
          "Chatbase + Calendly + Stripe + HubSpot + Zapier = 5 bills. Fieseros replaces them all for less than you'd pay for Chatbase alone at scale.",
      },
      {
        icon: ShieldCheck,
        title: "Built for service businesses",
        description:
          "Chatbase is a horizontal chatbot tool. Fieseros is purpose-built for field service — with job workflows, technician dispatch, route optimization, and asset tracking.",
      },
    ],
    faqs: [
      {
        question: "Can I keep my Chatbase chatbot and add Fieseros?",
        answer:
          "You can, but most customers replace Chatbase entirely. Fieseros AI agent does everything Chatbase does — train on your data, answer questions, escalate to humans — plus captures leads, books jobs, and collects payments. Running both duplicates cost and splits your data.",
      },
      {
        question: "How does Fieseros AI training compare to Chatbase?",
        answer:
          "Both train on URLs, PDFs, and knowledge bases. Fieseros additionally trains on your services, pricebook, and job history — so the agent can quote prices, check availability, and book real jobs, not just answer FAQs.",
      },
      {
        question: "Is Fieseros harder to set up than Chatbase?",
        answer:
          "No. The AI chat agent embeds with one snippet, just like Chatbase. The difference is Fieseros also includes the CRM, scheduling, and payments — which you can adopt gradually. Start with chat, add booking, then payments, as you grow.",
      },
      {
        question: "What does Fieseros cost vs Chatbase?",
        answer:
          "Chatbase charges per message and caps plan usage. Fieseros charges a flat subscription that includes chat, forms, CRM, scheduling, and 0% platform payment fees. For businesses that book jobs or collect payments through chat, Fieseros is typically cheaper at scale.",
      },
    ],
    related: [
      { label: "Fieseros vs Typeform", href: "/fieseros-vs-typeform" },
      { label: "Fieseros vs Tidio", href: "/fieseros-vs-tidio" },
      { label: "Conversational Forms Alternatives", href: "/conversational-forms-alternatives" },
    ],
  },
  {
    slug: "fieseros-vs-tidio",
    competitorName: "Tidio",
    competitorLabel: "Tidio",
    titleTag: "Fieseros vs Tidio (2026) — Live Chat + AI vs Full Operating System",
    h1: "Fieseros vs Tidio: live chat vs operating system",
    eyebrow: "Compare · Tidio",
    metaDescription:
      "Detailed Fieseros vs Tidio comparison. Tidio is live chat + AI bot; Fieseros is the full operating system — CRM, dispatch, invoicing, payments, and 24/7 voice. See the head-to-head.",
    heroSubtitle:
      "Tidio is excellent live chat with an AI bot for ecommerce stores. Fieseros is the operating system for service businesses — chat, forms, CRM, dispatch, invoicing, payments, and voice in one platform.",
    matrix: [
      { feature: "Live chat + AI chatbot", fieseros: true, competitor: true, note: "Both offer live chat with AI augmentation" },
      { feature: "Smart forms with 200+ widgets", fieseros: true, competitor: false, note: "Tidio is chat-focused; Fieseros includes a full form builder" },
      { feature: "Native CRM + customer history", fieseros: true, competitor: false, note: "Tidio has a basic visitor profile; Fieseros has a full service CRM" },
      { feature: "24/7 AI Voice Phone Receptionist", fieseros: true, competitor: false, note: "Tidio is text-only; Fieseros answers phone calls" },
      { feature: "Job scheduling + technician dispatch", fieseros: true, competitor: false, note: "Tidio can't book or dispatch field jobs" },
      { feature: "Invoicing + 33 payment gateways", fieseros: true, competitor: false, note: "Tidio has no invoicing or payment collection" },
      { feature: "0% platform payment fees", fieseros: true, competitor: false, note: "Fieseros charges 0% on top of gateway fees" },
      { feature: "Lead scoring + smart routing", fieseros: true, competitor: false, note: "Fieseros scores and routes leads to technicians" },
      { feature: "Mobile field PWA (offline)", fieseros: true, competitor: false, note: "Tidio has no field technician mobile app" },
      { feature: "Ecommerce-focused (Shopify, product FAQ)", fieseros: true, competitor: true, note: "Both support ecommerce; Tidio is more ecommerce-native" },
      { feature: "Field-service workflows (jobs, assets, routes)", fieseros: true, competitor: false, note: "Fieseros is purpose-built for trades and service" },
      { feature: "Autonomous business actions (jobs, invoices)", fieseros: true, competitor: false, note: "Fieseros executes operational actions, not just chat" },
    ],
    whySwitch: [
      {
        icon: Layers,
        title: "Chat → CRM → dispatch → invoice",
        description:
          "Tidio stops at the chat. Fieseros carries the conversation into a CRM record, a scheduled job, a dispatched technician, and a paid invoice — the full revenue loop.",
      },
      {
        icon: Phone,
        title: "Voice receptionist included",
        description:
          "Tidio is text-only. Fieseros answers your phone 24/7 with a natural-sounding AI voice agent — capturing the customers who call instead of chat.",
      },
      {
        icon: CreditCard,
        title: "Collect payments, not just chats",
        description:
          "Tidio can't collect a payment. Fieseros collects deposits at booking, sends branded invoices, and reconciles across 33 gateways — closing the revenue loop.",
      },
      {
        icon: Bot,
        title: "AI that takes action",
        description:
          "Tidio's AI answers questions. Fieseros AI takes action — creates a job, assigns a tech, generates a quote, charges a card. Real operational outcomes, not just replies.",
      },
      {
        icon: DollarSign,
        title: "Replace your whole stack",
        description:
          "Tidio + HubSpot + Calendly + Stripe + Zapier = 5 subscriptions. Fieseros replaces them all in one platform — typically for less than you'd pay Tidio alone at scale.",
      },
      {
        icon: ShieldCheck,
        title: "Built for service, not just ecommerce",
        description:
          "Tidio is optimized for ecommerce stores. Fieseros is purpose-built for field service and trade businesses — with job workflows, assets, technician dispatch, and route optimization.",
      },
    ],
    faqs: [
      {
        question: "I'm an ecommerce store — is Tidio better for me?",
        answer:
          "If you ONLY need live chat + product FAQ bot for an ecommerce store, Tidio is a solid choice. If you also offer services, installations, or appointments (which most stores do), Fieseros handles both product sales (via Shopify) and service bookings — in one platform.",
      },
      {
        question: "Can I keep Tidio for live chat and add Fieseros?",
        answer:
          "You can run both, but most service businesses replace Tidio with Fieseros to consolidate. Fieseros AI handles live chat, plus booking, payments, and CRM — so keeping Tidio duplicates cost and splits your customer data.",
      },
      {
        question: "Does Fieseros have a live chat (human) inbox like Tidio?",
        answer:
          "Yes. Fieseros has a shared multi-channel inbox for chat, SMS, email, and voice — with AI handling the first response and escalating to humans with full context. It's a superset of Tidio's live chat.",
      },
      {
        question: "How does Fieseros pricing compare to Tidio?",
        answer:
          "Tidio charges per seat and per conversation. Fieseros charges a flat subscription that includes chat, forms, CRM, dispatch, invoicing, and 0% platform payment fees. For service businesses that book jobs or collect payments, Fieseros is typically cheaper at scale.",
      },
    ],
    related: [
      { label: "Fieseros vs Chatbase", href: "/fieseros-vs-chatbase" },
      { label: "Fieseros vs Typeform", href: "/fieseros-vs-typeform" },
      { label: "AI Chatbot Alternatives", href: "/ai-chatbot-alternatives" },
    ],
  },
  {
    slug: "ai-chatbot-alternatives",
    competitorName: null,
    competitorLabel: "Other tools",
    titleTag: "Best AI Chatbot Alternatives in 2026 — Why Fieseros Wins",
    h1: "The best AI chatbot alternatives in 2026",
    eyebrow: "Compare · Alternatives",
    metaDescription:
      "Comparing the top AI chatbot alternatives — Chatbase, Tidio, Intercom, Drift, Fieseros. See which platform turns chat into booked jobs, paid invoices, and dispatched technicians.",
    heroSubtitle:
      "Most AI chatbot tools answer questions. Fieseros takes action — booking jobs, collecting payments, and dispatching technicians. Here's how it stacks up against Chatbase, Tidio, Intercom, and Drift.",
    matrix: [
      { feature: "AI chat trained on your data", fieseros: true, competitor: true, note: "All major chatbot platforms train on URLs/docs" },
      { feature: "Takes real business actions (book, pay, dispatch)", fieseros: true, competitor: false, note: "Most chatbots answer; Fieseros books and bills" },
      { feature: "Native CRM + customer history", fieseros: true, competitor: false, note: "Chatbase/Tidio/Intercom have basic or no CRM" },
      { feature: "24/7 AI Voice Phone Receptionist", fieseros: true, competitor: false, note: "Fieseros answers phone calls, not just chat" },
      { feature: "Field-service workflows (jobs, assets, routes)", fieseros: true, competitor: false, note: "No other chatbot platform is built for trades" },
      { feature: "Invoicing + 33 payment gateways", fieseros: true, competitor: false, note: "Chatbots don't collect payments or send invoices" },
      { feature: "0% platform payment fees", fieseros: true, competitor: false, note: "Fieseros charges 0% on top of gateway fees" },
      { feature: "Lead scoring + smart routing to techs", fieseros: true, competitor: false, note: "Fieseros scores and routes; others just hand off" },
      { feature: "Smart forms with 200+ widgets", fieseros: true, competitor: false, note: "Fieseros includes a full form builder alongside chat" },
      { feature: "Mobile field PWA (offline)", fieseros: true, competitor: false, note: "No chatbot platform includes a field technician app" },
      { feature: "Embed on any site", fieseros: true, competitor: true, note: "All major chatbot platforms offer embeddable widgets" },
      { feature: "Affordable for small service businesses", fieseros: true, competitor: false, note: "Intercom/Drift are enterprise-priced; Fieseros starts free" },
    ],
    whySwitch: [
      {
        icon: Bot,
        title: "Action, not just answers",
        description:
          "Other chatbots answer 'what are your hours?' Fieseros answers, then books the appointment, collects the deposit, and dispatches the technician — turning chat into revenue.",
      },
      {
        icon: Phone,
        title: "Voice + chat + forms",
        description:
          "Most alternatives are chat-only. Fieseros unifies AI chat, AI voice receptionist, and smart forms — one knowledge base, every channel, one platform.",
      },
      {
        icon: Layers,
        title: "The operating system, not a widget",
        description:
          "Chatbots are a feature in Fieseros, not the whole product. CRM, dispatch, invoicing, payments, and analytics come built in — no Zapier glue.",
      },
      {
        icon: DollarSign,
        title: "Priced for service businesses",
        description:
          "Intercom starts at $74/seat. Drift is enterprise-only. Fieseros starts free and scales with your job volume — built for plumbers, not just SaaS companies.",
      },
      {
        icon: CreditCard,
        title: "Collects money, end-to-end",
        description:
          "No chatbot alternative collects payments or sends invoices. Fieseros closes the loop — chat → quote → deposit → job → invoice → paid.",
      },
      {
        icon: ShieldCheck,
        title: "Built for the field",
        description:
          "Fieseros is purpose-built for trades and service businesses. Job workflows, asset tracking, route optimization, technician mobile app — no chatbot-only platform has these.",
      },
    ],
    faqs: [
      {
        question: "Which AI chatbot is best for small businesses?",
        answer:
          "For small service businesses, Fieseros offers the best value — free tier with 100 jobs, AI chat, voice receptionist, CRM, and 0% platform payment fees. Chatbase and Tidio are good for chat-only use; Intercom and Drift are priced for enterprise.",
      },
      {
        question: "What's the best Chatbase alternative?",
        answer:
          "Fieseros is the top Chatbase alternative for service businesses. It does everything Chatbase does (AI chat trained on your data) plus captures leads, books jobs, collects payments, and dispatches technicians — all natively, no Zapier.",
      },
      {
        question: "Is there a free AI chatbot for my website?",
        answer:
          "Yes. Fieseros offers a free tier that includes the AI chat agent, smart forms, CRM, and 100 jobs with 0% platform payment fees. It's the most generous free tier among AI chatbot platforms. Chatbase and Tidio also have free tiers but with stricter limits.",
      },
      {
        question: "Can I use Fieseros just for chat, without the CRM?",
        answer:
          "Yes. Fieseros AI Forms is a standalone product for businesses that want AI chat + smart forms without the field-service CRM. You can start with chat and upgrade to the full platform anytime — your data carries over.",
      },
    ],
    related: [
      { label: "Fieseros vs Chatbase", href: "/fieseros-vs-chatbase" },
      { label: "Fieseros vs Tidio", href: "/fieseros-vs-tidio" },
      { label: "Fieseros vs Typeform", href: "/fieseros-vs-typeform" },
    ],
  },
  {
    slug: "conversational-forms-alternatives",
    competitorName: null,
    competitorLabel: "Other tools",
    titleTag: "Best Conversational Form Alternatives in 2026 | Fieseros",
    h1: "The best conversational form alternatives in 2026",
    eyebrow: "Compare · Alternatives",
    metaDescription:
      "Comparing conversational form platforms — Typeform, Tally, Fillout, Formaloo, Fieseros. See which turns conversations into booked jobs, paid invoices, and dispatched technicians.",
    heroSubtitle:
      "Typeform, Tally, and Fillout make beautiful conversational forms. Fieseros turns those forms into AI chat agents that book jobs, collect payments, and dispatch technicians — the full operating system.",
    matrix: [
      { feature: "Conversational one-question-at-a-time UI", fieseros: true, competitor: true, note: "All major conversational form tools support this" },
      { feature: "AI chat agent (autonomous, 24/7)", fieseros: true, competitor: false, note: "Fieseros converts forms into AI chatbots" },
      { feature: "1-click form → chatbot conversion", fieseros: true, competitor: false, note: "No conversational form tool does this" },
      { feature: "Native CRM + customer history", fieseros: true, competitor: false, note: "Form tools have response storage; Fieseros has a CRM" },
      { feature: "24/7 AI Voice Phone Receptionist", fieseros: true, competitor: false, note: "Fieseros answers phone calls, not just forms" },
      { feature: "Job scheduling + technician dispatch", fieseros: true, competitor: false, note: "Form tools can't book or dispatch field jobs" },
      { feature: "Invoicing + 33 payment gateways", fieseros: true, competitor: false, note: "Form tools can't collect deposits or send invoices" },
      { feature: "0% platform payment fees", fieseros: true, competitor: false, note: "Fieseros charges 0% on top of gateway fees" },
      { feature: "Lead scoring + smart routing", fieseros: true, competitor: false, note: "Fieseros scores and routes; form tools just store responses" },
      { feature: "Autonomous business actions", fieseros: true, competitor: false, note: "Fieseros creates jobs, quotes, invoices from form data" },
      { feature: "Mobile field PWA (offline)", fieseros: true, competitor: false, note: "No form tool includes a field technician app" },
      { feature: "200+ form widgets + photo drawing", fieseros: true, competitor: true, note: "Fieseros matches Typeform/Tally widget variety" },
    ],
    whySwitch: [
      {
        icon: Bot,
        title: "Form → AI chatbot, instantly",
        description:
          "Typeform and Tally collect responses. Fieseros converts any form into an AI chat agent that fills the same fields through conversation — adapting questions to each visitor in real time.",
      },
      {
        icon: Layers,
        title: "Responses → revenue",
        description:
          "Form tools store submissions. Fieseros turns each submission into a CRM record, a booked job, a paid invoice — closing the loop from form fill to revenue.",
      },
      {
        icon: Phone,
        title: "Voice + chat + forms",
        description:
          "Form tools are form-only. Fieseros unifies AI chat, AI voice receptionist, and smart forms — one knowledge base, every channel, one platform.",
      },
      {
        icon: CreditCard,
        title: "Collect payments natively",
        description:
          "Form tools cap paid submissions or charge platform fees. Fieseros collects deposits, sends invoices, and reconciles across 33 gateways — with 0% platform fees.",
      },
      {
        icon: DollarSign,
        title: "One platform, one price",
        description:
          "Typeform + Calendly + Stripe + HubSpot + Zapier = 5 bills. Fieseros replaces them all — typically for less than you'd pay Typeform alone at scale.",
      },
      {
        icon: ShieldCheck,
        title: "Built for service businesses",
        description:
          "Form tools are horizontal. Fieseros is purpose-built for trades and service businesses — with job workflows, asset tracking, and technician dispatch.",
      },
    ],
    faqs: [
      {
        question: "What's the best Typeform alternative for service businesses?",
        answer:
          "Fieseros is the top Typeform alternative for service businesses. It matches Typeform's conversational form UX and widget variety, plus adds AI chat, CRM, dispatch, invoicing, and 0% platform payment fees — all in one platform.",
      },
      {
        question: "Is Fieseros free like Tally?",
        answer:
          "Fieseros has a free tier that includes 100 jobs, AI chat, smart forms, CRM, and 0% platform payment fees — more generous than Tally's free tier for businesses that collect payments or book jobs.",
      },
      {
        question: "Can I migrate my Typeform or Tally forms to Fieseros?",
        answer:
          "Yes. Fieseros AI form generator rebuilds any form from a URL or description, preserving conditional logic, question types, and branding. Most customers migrate in under an hour.",
      },
      {
        question: "Does Fieseros support conditional logic and calculations?",
        answer:
          "Yes. Fieseros smart forms support full conditional logic (show/hide, branching), live calculations, dynamic pricing, and skip rules — matching Typeform and Fillout feature-for-feature.",
      },
    ],
    related: [
      { label: "Fieseros vs Typeform", href: "/fieseros-vs-typeform" },
      { label: "Fieseros vs Tidio", href: "/fieseros-vs-tidio" },
      { label: "AI Chatbot Alternatives", href: "/ai-chatbot-alternatives" },
    ],
  },
  {
    slug: "fieseros-vs-elfchatbot",
    competitorName: "ElfChatbot",
    competitorLabel: "ElfChatbot",
    titleTag: "Fieseros vs ElfChatbot (2026) — Autonomous AI vs Basic FAQ Widget",
    h1: "Fieseros vs ElfChatbot: the 2026 comparison",
    eyebrow: "Compare · ElfChatbot (Elfsight)",
    metaDescription:
      "Comparing Fieseros vs ElfChatbot (by Elfsight). See why growing businesses upgrade from a simple FAQ website widget to an autonomous AI agent that books calendar slots, calculates quotes, and collects payments.",
    heroSubtitle:
      "ElfChatbot (by Elfsight) provides a quick zero-setup FAQ widget that crawls your site. Fieseros goes far beyond canned answers — autonomously qualifying leads, checking real-time calendar availability, calculating dynamic quotes, and collecting payments with 0% platform fees.",
    matrix: [
      { feature: "Website AI Chatbot Widget", fieseros: true, competitor: true, note: "Both embed on any website (WordPress, Shopify, Webflow, Wix)" },
      { feature: "Zero-Setup URL Web Crawler", fieseros: true, competitor: true, note: "Both crawl and index pages automatically from your URL" },
      { feature: "Knowledge Gaps & Unanswered Queue", fieseros: true, competitor: true, note: "Both log unanswered questions so you can answer them once" },
      { feature: "Plain-English Guardrail Rules", fieseros: true, competitor: true, note: "Both support behavioral instructions and prohibited topics" },
      { feature: "Live Google/Outlook Calendar Booking", fieseros: true, competitor: false, note: "ElfChatbot has no live calendar booking; Fieseros schedules real slots" },
      { feature: "Dynamic Formula Quote Calculator", fieseros: true, competitor: false, note: "ElfChatbot cannot calculate custom price estimates or square-foot math" },
      { feature: "Native In-Chat Payment Collection", fieseros: true, competitor: false, note: "ElfChatbot has no payment engine; Fieseros charges 0% platform fees" },
      { feature: "24/7 AI Voice Phone Receptionist", fieseros: true, competitor: false, note: "ElfChatbot is web-only; Fieseros answers actual phone calls" },
      { feature: "Multi-Step Form Intake (20,000+ Templates)", fieseros: true, competitor: false, note: "ElfChatbot only collects 3 fields (Name, Phone, Email)" },
      { feature: "Multichannel (WhatsApp, SMS, Instagram)", fieseros: true, competitor: false, note: "ElfChatbot is web-only; Fieseros supports 16 omnichannel touchpoints" },
      { feature: "Mobile Companion App with Operator Takeover", fieseros: true, competitor: false, note: "Fieseros includes iOS/Android app with instant 1-tap takeover" },
      { feature: "Native Field Service CRM & Dispatch", fieseros: true, competitor: false, note: "Fieseros dispatches technicians directly from conversations" },
    ],
    whySwitch: [
      {
        icon: Bot,
        title: "Autonomous Actions, Not Just Answers",
        description:
          "ElfChatbot stops at answering questions. Fieseros AI Chatbots execute real business transactions: checking live calendar slots, calculating dynamic quotes, and collecting deposits right inside the chat.",
      },
      {
        icon: Phone,
        title: "24/7 Voice Phone Receptionist",
        description:
          "Website visitors are only half your leads. Fieseros includes a 24/7 AI Voice Phone Receptionist that answers inbound phone calls, triages emergencies, and books appointments on the fly.",
      },
      {
        icon: CreditCard,
        title: "In-Chat Payments (0% Platform Fees)",
        description:
          "Accept credit cards, deposits, and retainers directly in chat via Stripe with 0% platform transaction fees. ElfChatbot has no payment capabilities.",
      },
      {
        icon: Zap,
        title: "16 Omnichannel Touchpoints",
        description:
          "Deploy your AI assistant across Web, WhatsApp, SMS, Instagram, Gmail, and phone. ElfChatbot only operates as a web chat bubble.",
      },
      {
        icon: Layers,
        title: "Full CRM, Scheduling & Dispatch Built In",
        description:
          "Stop stitching together chatbot widgets, calendars, and spreadsheets. Fieseros unifies your conversational intake with automated CRM, job dispatch, and invoicing.",
      },
      {
        icon: ShieldCheck,
        title: "Dedicated Mobile Operator App",
        description:
          "Receive instant push notifications for hot leads and take over live chats from anywhere with our iOS/Android companion app.",
      },
    ],
    faqs: [
      {
        question: "How is Fieseros different from ElfChatbot by Elfsight?",
        answer:
          "ElfChatbot is a lightweight FAQ widget designed to crawl website text and answer simple visitor questions. Fieseros is a complete autonomous agent and smart intake platform that answers questions, books live calendar appointments, calculates custom price quotes, collects credit card payments, and dispatches field technicians.",
      },
      {
        question: "Does Fieseros have a 'Knowledge Gaps' feature like ElfChatbot?",
        answer:
          "Yes. Fieseros features an automated Unanswered Questions Review Queue. Whenever a customer asks something where AI confidence is low, it is logged to your dashboard. You can answer it with one click, and the answer is instantly indexed into vector embeddings.",
      },
      {
        question: "Can Fieseros replace our scheduling and quoting software?",
        answer:
          "Yes. Unlike ElfChatbot which requires third-party links, Fieseros has native two-way calendar sync (Google Calendar, Outlook) and formula quote calculators, turning customer conversations directly into confirmed appointments and invoices.",
      },
      {
        question: "Does Fieseros charge transaction fees on payments collected?",
        answer:
          "No. Fieseros charges 0% platform transaction fees on all payments and deposits processed through the chatbot or smart intake forms.",
      },
    ],
    related: [
      { label: "Fieseros vs Chatbase", href: "/fieseros-vs-chatbase" },
      { label: "Fieseros vs Tidio", href: "/fieseros-vs-tidio" },
      { label: "Fieseros vs Typeform", href: "/fieseros-vs-typeform" },
      { label: "AI Chatbot Alternatives", href: "/ai-chatbot-alternatives" },
    ],
  },
];


export function getComparisonBySlug(slug: string): ComparisonConfig | undefined {
  return comparisons.find((c) => c.slug === slug);
}
