import {
  LayoutTemplate,
  ShoppingCart,
  Globe,
  Code,
  Calendar,
  CreditCard,
  Zap,
  BookOpen,
  Sparkles,
  Bot,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Feature } from "@/components/seo/feature-grid";
import type { FaqItem } from "@/lib/seo/schemas";

export type PlatformKind = "platform" | "integration";

export interface PlatformConfig {
  kind: PlatformKind;
  slug: string;
  titleTag: string;
  h1: string;
  eyebrow: string;
  metaDescription: string;
  heroSubtitle: string;
  icon: LucideIcon;
  metrics: { value: string; label: string }[];
  features: Feature[];
  installSteps: { step: string; title: string; description: string }[];
  faqs: FaqItem[];
}

export const platforms: PlatformConfig[] = [
  {
    kind: "platform",
    slug: "wordpress",
    titleTag: "GPTForm for WordPress — AI Chatbot & Smart Forms Plugin Alternative",
    h1: "Add 24/7 AI chat & smart forms to WordPress in 60 seconds",
    eyebrow: "Platform · WordPress AI Chat & Forms",
    metaDescription:
      "Embed GPTForm AI Chatbot and smart forms on any WordPress site with 1 line of code. No plugin conflicts, zero database bloat, 100% Core Web Vitals friendly.",
    heroSubtitle:
      "Zero plugins to install, zero database bloat, zero security vulnerabilities. Paste 1 snippet into your WordPress header or use a shortcode to deploy an autonomous AI agent and smart intake forms that capture leads, book appointments, and collect payments 24/7.",
    icon: LayoutTemplate,
    metrics: [
      { value: "60s", label: "From 1-line snippet to live agent" },
      { value: "0", label: "Heavy plugins to install or update" },
      { value: "100%", label: "Compatible with Elementor, Divi & Gutenberg" },
    ],
    features: [
      {
        icon: Globe,
        badge: "Zero Bloat",
        title: "1-Line Universal Header Embed",
        description:
          "Drop the lightweight GPTForm script into your theme header or header-injection tool. The AI chat widget loads asynchronously on every page with zero drag on Core Web Vitals.",
      },
      {
        icon: Code,
        title: "Shortcode & Block for Inline Forms",
        description:
          "Embed dynamic smart forms, multi-step intake, or price calculators anywhere in posts, pages, or Elementor templates using the [gptform id=\"...\"] shortcode.",
      },
      {
        icon: Calendar,
        title: "In-Chat & On-Page Booking",
        description:
          "Let clients book appointments directly through your WordPress site with real-time 2-way Google Calendar and Microsoft Outlook availability sync.",
      },
      {
        icon: CreditCard,
        title: "WooCommerce-Safe Payments (0% Fee)",
        description:
          "GPTForm runs independently of WooCommerce with zero conflict. Collect service deposits, booking fees, and retainers via Stripe or Apple Pay with 0% platform fees.",
      },
      {
        icon: Zap,
        badge: "AI Powered",
        title: "Automatic Site Content Crawling",
        description:
          "Just enter your WordPress site URL. GPTForm crawls your blog posts, service pages, and FAQs in 60 seconds so your agent answers questions accurately from day one.",
      },
      {
        icon: ShieldCheck,
        title: "Knowledge Gaps Discovery",
        description:
          "Whenever a WordPress visitor asks a question your site doesn't cover, it is logged in your Knowledge Gaps inbox. Answer it once, and the agent knows it permanently.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your embed snippet",
        description:
          "In your GPTForm dashboard, navigate to Embed & Share and copy your unique 1-line JavaScript snippet.",
      },
      {
        step: "2",
        title: "Paste into WordPress header",
        description:
          "Add the snippet to your theme header via Appearance → Theme File Editor (before </head>), or use a free plugin like 'WPCode / Insert Headers and Footers'.",
      },
      {
        step: "3",
        title: "Publish & test live",
        description:
          "Save your settings and visit your website. Your AI chat agent appears in the bottom corner, fully trained on your website content.",
      },
      {
        step: "4",
        title: "Embed inline forms (optional)",
        description:
          "Copy the iframe or shortcode snippet to place interactive multi-step forms or quote calculators directly inside any Elementor or Gutenberg page.",
      },
    ],
    faqs: [
      {
        question: "Do I need to install a heavy WordPress plugin?",
        answer:
          "No. GPTForm uses a lightweight 1-line script tag. This completely avoids plugin bloat, database clutter, theme conflicts, and security vulnerabilities associated with running heavy PHP plugins.",
      },
      {
        question: "Will the chat widget slow down my WordPress site or hurt SEO?",
        answer:
          "Not at all. The script is less than 15KB, loads asynchronously after first paint, and the full widget is lazy-loaded only when engaged. It has zero measurable impact on PageSpeed Insights or Core Web Vitals.",
      },
      {
        question: "Does it work with page builders like Elementor, Divi, and Bricks?",
        answer:
          "Yes. The header embed works across all page builders automatically. For inline forms and price calculators, you can paste the embed code into Elementor's HTML or Shortcode widget, Divi's Code module, or Gutenberg's Custom HTML block.",
      },
      {
        question: "Can I use GPTForm alongside WooCommerce?",
        answer:
          "Yes. GPTForm operates harmoniously alongside WooCommerce. The AI agent can answer customer inquiries and book service consultations, while WooCommerce processes product orders — without any payment gateway collisions.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "shopify",
    titleTag: "GPTForm for Shopify — AI Sales Assistant & Service Booking Embed",
    h1: "Turn Shopify visitors into buyers and booked appointments",
    eyebrow: "Platform · Shopify AI Assistant & Booking",
    metaDescription:
      "Embed GPTForm on your Shopify store to answer product questions, book installations, and capture high-intent leads. 1-click theme app embed, no coding required.",
    heroSubtitle:
      "Your Shopify store sells products; GPTForm provides the expert AI sales assistant and service booking engine. Answer product questions directly from your catalog, book installation appointments, and capture high-intent leads 24/7.",
    icon: ShoppingCart,
    metrics: [
      { value: "1-Click", label: "Theme App Embed, zero code edits" },
      { value: "+34%", label: "More service & installation bookings" },
      { value: "0", label: "Apps slowing down your Liquid code" },
    ],
    features: [
      {
        icon: ShoppingCart,
        badge: "Native Embed",
        title: "Native Shopify Theme App Embed",
        description:
          "Enable GPTForm directly in Shopify Theme Customize → App Embeds with a single toggle. No Liquid code modifications and zero theme corruption risks.",
      },
      {
        icon: Calendar,
        title: "In-Store Service & Install Booking",
        description:
          "Shoppers purchasing items that require assembly, installation, or consultation can book an appointment slot right in the chat before or after checkout.",
      },
      {
        icon: Zap,
        badge: "Catalog AI",
        title: "Product Catalog Q&A Engine",
        description:
          "The AI agent learns your Shopify product catalog, sizing specifications, and return policies, answering customer questions instantly to eliminate purchase hesitation.",
      },
      {
        icon: CreditCard,
        title: "In-Chat Checkout & Deposit Collection",
        description:
          "Collect service fees, custom project retainers, or installation deposits directly through Stripe or PayPal with 0% platform fees without touching Shopify cart limits.",
      },
      {
        icon: Globe,
        title: "Dedicated Service Landing Pages",
        description:
          "Embed full-width smart intake forms or custom price calculators on dedicated Shopify service pages using custom Liquid sections.",
      },
      {
        icon: BookOpen,
        title: "Abandoned Chat & Form Recovery",
        description:
          "When an interested shopper drops off midway through an intake flow, automated SMS and email follow-ups re-engage them with a direct link to complete their booking.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Enter your Shopify store URL",
        description:
          "In the GPTForm dashboard, enter your Shopify store URL to automatically ingest your product pages, FAQs, and store policies.",
      },
      {
        step: "2",
        title: "Toggle Theme App Embed",
        description:
          "Open Shopify Admin → Online Store → Themes → Customize → App Embeds, and switch on the GPTForm toggle.",
      },
      {
        step: "3",
        title: "Configure agent knowledge & actions",
        description:
          "Set up your calendar availability, booking services, and custom qualification questions in your GPTForm dashboard.",
      },
      {
        step: "4",
        title: "Live 24/7 shopper assistance",
        description:
          "Your AI assistant is live across your store, assisting shoppers, answering specs, and capturing high-value consultation leads.",
      },
    ],
    faqs: [
      {
        question: "Do I need to edit Liquid code or hire a developer?",
        answer:
          "No developer needed. GPTForm uses Shopify's official Theme App Embed framework. You simply toggle it on inside your Shopify Theme Customizer, and it appears automatically without touching any Liquid code.",
      },
      {
        question: "Does GPTForm conflict with standard Shopify checkout?",
        answer:
          "No. Physical product purchases flow through your normal Shopify checkout. Any service appointments, installation deposits, or consulting retainers can be collected either through Stripe in-chat (0% fee) or linked to Shopify draft orders.",
      },
      {
        question: "Can the AI agent answer questions about product specs and availability?",
        answer:
          "Yes. GPTForm crawls your product descriptions, size guides, materials, and policies. It answers customer queries in real time with high accuracy, reducing pre-purchase hesitation.",
      },
      {
        question: "Can human agents take over live conversations with Shopify shoppers?",
        answer:
          "Yes. If a shopper asks for a human or has a complex request, your team receives an instant notification on mobile and desktop, allowing 1-click live operator takeover.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "wix",
    titleTag: "GPTForm for Wix — AI Chatbot & Smart Intake Forms",
    h1: "Supercharge your Wix website with an autonomous AI agent",
    eyebrow: "Platform · Wix AI Chat & Smart Forms",
    metaDescription:
      "Embed GPTForm AI Chatbot and dynamic forms on any Wix site in minutes. Capture leads, book appointments, and answer customer FAQs 24/7 with zero Velo coding.",
    heroSubtitle:
      "No Velo coding required. Paste your GPTForm snippet into Wix Custom Code settings or drop our responsive iframe widget into any page. Deploy an AI agent that crawls your Wix pages and turns visitors into booked clients 24/7.",
    icon: Globe,
    metrics: [
      { value: "5 min", label: "Quick setup on any Wix site" },
      { value: "All", label: "Wix templates & Studio supported" },
      { value: "24/7", label: "Autonomous lead capture & booking" },
    ],
    features: [
      {
        icon: Globe,
        badge: "Wix Code",
        title: "Site-Wide Custom Code Injection",
        description:
          "Paste the GPTForm snippet into Wix Settings → Custom Code to launch the floating AI chat assistant across all pages of your site simultaneously.",
      },
      {
        icon: Code,
        title: "Responsive HTML Widget for Inline Forms",
        description:
          "Use Wix's native Embed HTML / iframe widget to drop interactive multi-step forms, price calculators, or booking widgets into any section.",
      },
      {
        icon: Calendar,
        title: "Real-Time Calendar Scheduling",
        description:
          "Allow clients to self-schedule consultations and service appointments directly on your Wix site with live two-way Google Calendar synchronization.",
      },
      {
        icon: Zap,
        badge: "AI Grounded",
        title: "Automatic Wix Site Ingestion",
        description:
          "GPTForm crawls all pages, blog posts, and FAQs on your Wix site in under 60 seconds, enabling the AI agent to answer client inquiries with complete factual accuracy.",
      },
      {
        icon: CreditCard,
        title: "Wix Payments Independent (0% Fee)",
        description:
          "Collect deposits and service payments in chat via Stripe with 0% platform transaction fees — completely independent of Wix Payments limitations.",
      },
      {
        icon: ShieldCheck,
        title: "Mobile Optimized for Wix Mobile Views",
        description:
          "Designed to adapt seamlessly to Wix's separate mobile layout with smart bottom-sheet UI and safe-area padding for mobile browsers.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your embed snippet",
        description:
          "In your GPTForm dashboard, copy your one-line JavaScript embed snippet.",
      },
      {
        step: "2",
        title: "Open Wix Custom Code",
        description:
          "In your Wix Dashboard, go to Settings → Custom Code (under Advanced) and click '+ Add Custom Code'.",
      },
      {
        step: "3",
        title: "Paste & set to Header",
        description:
          "Paste your snippet, select 'All Pages', place code in 'Head', and click Apply.",
      },
      {
        step: "4",
        title: "Publish & test",
        description:
          "Publish your Wix site. The AI chat widget appears immediately in the bottom-right corner, ready to engage visitors.",
      },
    ],
    faqs: [
      {
        question: "Do I need a Wix Velo (Corvid) developer subscription?",
        answer:
          "No. GPTForm works on all standard paid Wix plans using the built-in Custom Code feature in Wix Settings. You do not need developer mode or Velo coding knowledge.",
      },
      {
        question: "Does the AI chat widget work on Wix mobile sites?",
        answer:
          "Yes. GPTForm is fully mobile responsive. On mobile screens, it renders an ergonomic floating button and a clean full-screen sheet that doesn't obstruct navigation.",
      },
      {
        question: "Can I embed intake forms and calculators inline on Wix pages?",
        answer:
          "Yes. You can add an 'Embed HTML' element in the Wix Editor, paste your GPTForm iframe snippet, and place the interactive form directly inside any page section.",
      },
      {
        question: "Can I use GPTForm alongside Wix Bookings or Wix Chat?",
        answer:
          "Yes. You can run both, or replace Wix Chat with GPTForm to upgrade from simple manual live chat to an autonomous AI agent that answers FAQs and books calendar slots 24/7.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "webflow",
    titleTag: "GPTForm for Webflow — AI Agent & Interactive Forms Embed",
    h1: "Pair Webflow's pristine design with an intelligent AI agent",
    eyebrow: "Platform · Webflow AI Agent & Forms",
    metaDescription:
      "Embed GPTForm AI Chatbot and dynamic calculation forms on any Webflow site. Clean script injection, zero styling clashes, 100% Core Web Vitals friendly.",
    heroSubtitle:
      "Webflow's clean code deserves an equally elegant AI agent. Paste the GPTForm snippet into Webflow Project Settings → Custom Code to launch a website-grounded AI assistant that books calendar slots, calculates quotes, and captures leads across every published page.",
    icon: Code,
    metrics: [
      { value: "Project-wide", label: "Single custom code snippet" },
      { value: "<15KB", label: "Lightweight, async loaded script" },
      { value: "100%", label: "Compatible with Webflow CMS items" },
    ],
    features: [
      {
        icon: Code,
        badge: "Clean Code",
        title: "Global Project-Wide Custom Code Embed",
        description:
          "Paste the GPTForm script into Webflow Project Settings → Custom Code → Head Code. The AI agent activates across your entire domain with zero per-page maintenance.",
      },
      {
        icon: Globe,
        title: "Webflow Embed Element for Inline Intake",
        description:
          "Drag Webflow's native Embed element anywhere onto a page or CMS template to insert conversational forms, interactive calculators, or calendar pickers.",
      },
      {
        icon: Sparkles,
        title: "Zero CSS Bleed (Scoped Shadow DOM)",
        description:
          "The chat widget and embed components render inside an isolated Shadow DOM, guaranteeing that your carefully crafted Webflow styles are never overridden.",
      },
      {
        icon: Calendar,
        title: "CMS-Driven Dynamic Booking Pages",
        description:
          "Connect Webflow CMS collection items to distinct GPTForm booking flows — each service line can have its own tailored qualification questions and calendar rules.",
      },
      {
        icon: CreditCard,
        title: "Webflow Ecommerce Independent",
        description:
          "Collect service deposits, consultation retainers, and milestone payments directly in chat via Stripe with 0% platform transaction fees.",
      },
      {
        icon: Zap,
        badge: "Fast",
        title: "Lighthouse 100 & Core Web Vitals Safe",
        description:
          "Engineered to load asynchronously after first paint with zero render-blocking resources, preserving your Webflow site's top-tier speed scores.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your embed snippet",
        description:
          "In the GPTForm dashboard, copy your one-line script snippet.",
      },
      {
        step: "2",
        title: "Paste into Webflow Custom Code",
        description:
          "In Webflow Designer, go to Project Settings → Custom Code → Head Code and paste the snippet.",
      },
      {
        step: "3",
        title: "Publish site",
        description:
          "Publish your Webflow site to both your webflow.io staging subdomain and custom production domain.",
      },
      {
        step: "4",
        title: "Add inline forms (optional)",
        description:
          "Drag a Webflow Embed element onto any page and paste the GPTForm iframe code to place a smart form inline.",
      },
    ],
    faqs: [
      {
        question: "Do I need a Webflow CMS or Ecommerce plan?",
        answer:
          "No. GPTForm works on any paid Webflow site plan that includes Custom Code. You do not need an Ecommerce or high-tier plan.",
      },
      {
        question: "Will the script affect my Webflow site's performance score?",
        answer:
          "No. The script is less than 15KB, loads asynchronously, and the widget bundle lazy-loads only when a user interacts. It will not hurt your Lighthouse or Core Web Vitals metrics.",
      },
      {
        question: "Can I use GPTForm instead of native Webflow Forms?",
        answer:
          "Yes. Webflow native forms are static and lack multi-step conversational logic, formula calculations, live calendar booking, and in-chat payments. GPTForm replaces them with dynamic conversational experiences.",
      },
      {
        question: "Does it work on Webflow staging subdomains?",
        answer:
          "Yes. The script functions seamlessly on your your-site.webflow.io staging link, allowing you to test and fine-tune your agent before pushing changes to production.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "squarespace",
    titleTag: "GPTForm for Squarespace — AI Chatbot & Smart Booking Forms",
    h1: "Add 24/7 AI chat and intelligent forms to your Squarespace site",
    eyebrow: "Platform · Squarespace AI Agent & Forms",
    metaDescription:
      "Embed GPTForm AI Chatbot and smart booking forms on Squarespace using Code Injection. Capture leads, book appointments, and answer questions 24/7 with zero coding.",
    heroSubtitle:
      "Elevate your Squarespace site with an intelligent conversational assistant. Paste the GPTForm snippet into Squarespace Code Injection to provide 24/7 visitor support, live appointment scheduling, and automated lead qualification that matches your brand aesthetics.",
    icon: Globe,
    metrics: [
      { value: "Code Injection", label: "Site-wide 1-step install" },
      { value: "All", label: "Squarespace 7.0 & 7.1 templates" },
      { value: "24/7", label: "Autonomous client capture & booking" },
    ],
    features: [
      {
        icon: Code,
        badge: "Code Injection",
        title: "Site-Wide Header Code Injection",
        description:
          "Squarespace's built-in Code Injection (Settings → Advanced → Code Injection) lets you add the script once to activate the AI agent across your entire website.",
      },
      {
        icon: Globe,
        title: "Code Block for Inline Intake & Calculators",
        description:
          "Add a Squarespace Code Block to any page section to embed interactive calculation forms, multi-step intake, or real-time appointment booking widgets.",
      },
      {
        icon: Calendar,
        title: "2-Way Google & Outlook Calendar Booking",
        description:
          "Let clients book appointments directly on your Squarespace site with real-time bidirectional synchronization, avoiding double-bookings.",
      },
      {
        icon: Zap,
        badge: "AI",
        title: "Automatic Site Content Ingestion",
        description:
          "GPTForm crawls your Squarespace service pages, blog articles, and FAQs automatically, grounding the AI agent with strict factual accuracy.",
      },
      {
        icon: CreditCard,
        title: "Squarespace Commerce Independent (0% Fee)",
        description:
          "Collect consultation fees and project deposits via Stripe or Apple Pay with 0% platform fees, completely independent of Squarespace Commerce transaction costs.",
      },
      {
        icon: ShieldCheck,
        title: "Mobile Responsive & Safe-Area Aware",
        description:
          "Adapts smoothly to mobile screens on Squarespace 7.0 and 7.1, respecting browser safe-area insets and bottom navigation bars.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your embed snippet",
        description:
          "In your GPTForm dashboard, copy your one-line JavaScript embed snippet.",
      },
      {
        step: "2",
        title: "Open Squarespace Code Injection",
        description:
          "In Squarespace, navigate to Settings → Advanced → Code Injection (or Developer Tools → Code Injection in 7.1).",
      },
      {
        step: "3",
        title: "Paste into Header & save",
        description:
          "Paste the snippet into the Header textarea and click Save in the top-left corner.",
      },
      {
        step: "4",
        title: "Verify your live assistant",
        description:
          "Visit your live Squarespace site to test your new AI assistant. Customize its appearance and behavior anytime from your GPTForm dashboard.",
      },
    ],
    faqs: [
      {
        question: "Which Squarespace plan is required for Code Injection?",
        answer:
          "Code Injection requires a Squarespace Business plan or higher (including all Commerce plans). If you are on a Personal plan, upgrading to Business enables Code Injection immediately without rebuilding your site.",
      },
      {
        question: "Does the chat widget work on Squarespace mobile view?",
        answer:
          "Yes. The widget is fully responsive and automatically optimizes its layout for mobile screens, ensuring a seamless user experience across iPhone, Android, and tablets.",
      },
      {
        question: "Can I embed forms inline using Squarespace Code Blocks?",
        answer:
          "Yes. You can add a standard Code Block anywhere on a page, paste your GPTForm iframe code, and render an interactive intake form or price calculator directly in the page layout.",
      },
      {
        question: "Does this conflict with Acuity / Squarespace Scheduling?",
        answer:
          "No. GPTForm runs alongside Acuity without conflict. Many businesses choose to replace Acuity with GPTForm to unify AI chat, appointment scheduling, and CRM intake in one platform.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "html",
    titleTag: "Universal Embed — AI Chatbot & Forms for Any HTML / JS Website | GPTForm",
    h1: "Embed AI chat & smart forms on any custom website or web app",
    eyebrow: "Platform · Universal HTML / React / Vue / PHP",
    metaDescription:
      "Add GPTForm AI Chatbot and dynamic forms to any website — Next.js, React, Vue, Angular, PHP, Astro, or plain HTML. Single <script> tag, <15KB footprint.",
    heroSubtitle:
      "Built with React, Next.js, Vue, Laravel, or plain HTML? GPTForm is framework-agnostic. Drop a single asynchronous script tag into your template to equip your site with an autonomous AI agent, interactive quote calculators, and real-time appointment booking.",
    icon: Code,
    metrics: [
      { value: "1 Tag", label: "Single universal script embed" },
      { value: "Any", label: "Framework, CMS, or static generator" },
      { value: "<15KB", label: "Async, non-blocking bundle" },
    ],
    features: [
      {
        icon: Code,
        badge: "Universal",
        title: "Single Universal Script Tag",
        description:
          "Add one <script> tag before </head> in your HTML. Works flawlessly with plain HTML, PHP, Laravel, Ruby on Rails, Django, ASP.NET, and modern JS frameworks.",
      },
      {
        icon: Globe,
        title: "SPA & Hydration Resilient",
        description:
          "Engineered for client-side routing. The widget persists smoothly across route transitions in Next.js, Nuxt, SvelteKit, React Router, and Vue Router without reloading.",
      },
      {
        icon: Sparkles,
        title: "Isolated Shadow DOM Styling",
        description:
          "Rendered in an isolated Shadow DOM boundary, preventing your site's Tailwind, Bootstrap, or custom CSS rules from distorting the widget UI.",
      },
      {
        icon: Calendar,
        title: "Hosted Standalone Booking Pages",
        description:
          "Prefer not to embed? Direct visitors to your branded, hosted booking link at gptform.ai/book/[your-slug] — complete with live Google Calendar sync.",
      },
      {
        icon: CreditCard,
        title: "Secure Tokenized Checkout (0% Fee)",
        description:
          "In-chat payments utilize tokenized iframes through Stripe, Apple Pay, and Google Pay, ensuring strict PCI-DSS compliance and 0% platform fees.",
      },
      {
        icon: BookOpen,
        title: "JavaScript SDK & Event Hooks",
        description:
          "Trigger the chat widget programmatically with window.GPTForm.open(), listen for booking completion events, or pre-populate user context via JavaScript.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your universal snippet",
        description:
          "In your GPTForm dashboard, copy your one-line universal <script> tag containing your unique workspace identifier.",
      },
      {
        step: "2",
        title: "Add to your HTML <head>",
        description:
          "Paste the snippet into your root HTML template (e.g. index.html, layout.tsx, or base.html) before the closing </head> tag.",
      },
      {
        step: "3",
        title: "Deploy your site",
        description:
          "Deploy your site to Vercel, Netlify, AWS, or any web host. The AI chat widget appears automatically.",
      },
      {
        step: "4",
        title: "Embed inline iframes (optional)",
        description:
          "To embed forms or calculators inline, paste the responsive iframe snippet anywhere within your markup.",
      },
    ],
    faqs: [
      {
        question: "Does the embed work with Single Page Apps (React, Next.js, Vue, Angular)?",
        answer:
          "Yes. GPTForm is specifically engineered for single-page applications. It attaches cleanly to the DOM and persists across client-side route transitions without flickering or re-initializing.",
      },
      {
        question: "Will the script hurt my site's Core Web Vitals or PageSpeed scores?",
        answer:
          "No. The script is under 15KB and loads asynchronously after main-thread tasks are complete. It causes zero layout shifts (CLS) and will not degrade your Lighthouse performance rating.",
      },
      {
        question: "Can I open the chat programmatically with my own button?",
        answer:
          "Yes. GPTForm exposes a global JavaScript API. You can wire custom buttons, navbar links, or CTAs to execute window.GPTForm.open() or trigger specific conversation intents.",
      },
      {
        question: "Can I customize the widget colors and avatar?",
        answer:
          "Yes. You can customize the widget color palette, dark/light theme, launcher icon, agent avatar, greeting messages, and brand logo directly from your GPTForm dashboard without changing any code.",
      },
    ],
  },
];

export const integrations: PlatformConfig[] = [
  {
    kind: "integration",
    slug: "google-calendar",
    titleTag: "Google Calendar 2-Way Sync Integration | GPTForm",
    h1: "Real-time two-way sync with Google Calendar",
    eyebrow: "Integration · Google Calendar",
    metaDescription:
      "Connect Google Calendar to GPTForm for bidirectional synchronization. Block personal events automatically, book real appointments in chat, and eliminate double-booking.",
    heroSubtitle:
      "Never play calendar phone tag again. GPTForm connects directly to Google Calendar via OAuth: personal commitments block availability in real time, and client bookings land on your calendar with automated Google Meet video links.",
    icon: Calendar,
    metrics: [
      { value: "2-Way", label: "Real-time bidirectional calendar sync" },
      { value: "0", label: "Double-bookings or scheduling conflicts" },
      { value: "Per-User", label: "Individual team calendar connections" },
    ],
    features: [
      {
        icon: Calendar,
        badge: "2-Way Sync",
        title: "Bidirectional Synchronization",
        description:
          "Appointments booked in chat appear on your Google Calendar within seconds, and personal Google Calendar events instantly block booking slots on your website.",
      },
      {
        icon: Globe,
        title: "Per-Team Member Calendar Linking",
        description:
          "Each specialist or technician connects their personal Google account. Dentist appointments and personal errands automatically blackout their booking availability.",
      },
      {
        icon: Zap,
        title: "Auto-Generated Google Meet Links",
        description:
          "For virtual consultations and remote meetings, GPTForm automatically creates a unique Google Meet video conference link and inserts it into the calendar invite.",
      },
      {
        icon: CreditCard,
        title: "Buffer Times & Daily Booking Limits",
        description:
          "Prevent meeting fatigue. Configure automated buffer minutes before and after appointments and set daily maximum booking caps per team member.",
      },
      {
        icon: Code,
        title: "Color-Coded Event Categorization",
        description:
          "Bookings display in distinct Google Calendar event colors based on service type — consultations, repairs, assessments, or VIP accounts.",
      },
      {
        icon: BookOpen,
        title: "Shared Team Calendar Support",
        description:
          "Connect company-wide shared Google Calendars alongside individual staff calendars to coordinate resource rooms, company holidays, and dispatch shifts.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Connect Google account",
        description:
          "In GPTForm Settings → Integrations → Google Calendar, click 'Connect with Google' and authorize via secure OAuth.",
      },
      {
        step: "2",
        title: "Select calendars to sync",
        description:
          "Choose which Google Calendars to read for busy time slots and which calendar new bookings should be written to.",
      },
      {
        step: "3",
        title: "Set buffer & scheduling rules",
        description:
          "Define your working hours, timezone, advance notice requirements, and buffer minutes between appointments.",
      },
      {
        step: "4",
        title: "Test live scheduling",
        description:
          "Book a test appointment through your AI chat agent or form — verify that it appears instantly on your Google Calendar.",
      },
    ],
    faqs: [
      {
        question: "How fast do bookings sync with Google Calendar?",
        answer:
          "Sync occurs in real time via Google Calendar webhooks. Bookings made on your site appear in Google Calendar within 5 seconds, and new personal events block website slots almost instantaneously.",
      },
      {
        question: "Can multiple team members connect their own Google accounts?",
        answer:
          "Yes. Each team member connects their own personal Google Calendar via OAuth. GPTForm combines individual availability with round-robin or territory assignment rules.",
      },
      {
        question: "Does it automatically generate Google Meet video call links?",
        answer:
          "Yes. If a service is designated as a virtual meeting, GPTForm generates a unique Google Meet link and includes it in both the client confirmation and the calendar invite.",
      },
      {
        question: "Will my past Google Calendar events be imported?",
        answer:
          "No. GPTForm only queries future event time blocks to calculate open availability, ensuring your private historical events remain untouched and confidential.",
      },
    ],
  },
  {
    kind: "integration",
    slug: "stripe",
    titleTag: "Stripe Integration — In-Chat Checkout & 0% Platform Fees | GPTForm",
    h1: "Accept payments and booking deposits with Stripe",
    eyebrow: "Integration · Stripe Payments",
    metaDescription:
      "Connect Stripe to GPTForm to accept credit cards, Apple Pay, Google Pay, and ACH in-chat and on-form with 0% platform fees. Instant reconciliation and automated invoices.",
    heroSubtitle:
      "The world's most powerful payment platform meets conversational AI. Connect Stripe in 1 click to collect booking deposits, sell service packages, and settle invoices directly inside the chat flow — with 0% platform transaction fees.",
    icon: CreditCard,
    metrics: [
      { value: "0%", label: "Platform fees — keep 100% of your earnings" },
      { value: "1-Click", label: "Secure Stripe OAuth connection" },
      { value: "All", label: "Cards, Apple Pay, Google Pay & ACH" },
    ],
    features: [
      {
        icon: CreditCard,
        badge: "0% Fees",
        title: "0% Platform Transaction Surcharge",
        description:
          "Unlike competitors that charge an extra 1% to 3% platform fee, GPTForm charges 0%. You only pay standard Stripe processing rates, maximizing your gross margins.",
      },
      {
        icon: Calendar,
        title: "Booking Deposits & Retainers",
        description:
          "Require upfront deposits or credit card pre-authorizations before appointment confirmation, virtually eliminating costly customer no-shows.",
      },
      {
        icon: Zap,
        badge: "In-Chat",
        title: "Native In-Chat Tokenized Checkout",
        description:
          "Customers complete payments without leaving the chat window. Apple Pay, Google Pay, credit cards, and ACH render seamlessly inside the conversation stream.",
      },
      {
        icon: Globe,
        title: "Recurring Subscriptions & Retainers",
        description:
          "Set up automated recurring Stripe subscriptions for monthly maintenance agreements, retainers, and ongoing service plans.",
      },
      {
        icon: Code,
        title: "Instant Webhook Reconciliation",
        description:
          "Every payment, dispute, or refund syncs automatically with your CRM records and invoices via real-time Stripe webhooks — zero manual bookkeeping.",
      },
      {
        icon: BookOpen,
        title: "Stripe Connect Marketplace Support",
        description:
          "Marketplace and franchise operators can split payments between platform fees and service providers with built-in Stripe Connect routing.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Connect Stripe account",
        description:
          "In GPTForm Settings → Payments → Stripe, click 'Connect with Stripe' and authorize your account via secure OAuth. No API keys to copy.",
      },
      {
        step: "2",
        title: "Configure payment methods",
        description:
          "Enable credit cards, Apple Pay, Google Pay, or ACH transfers, and set up your deposit and cancellation policy rules.",
      },
      {
        step: "3",
        title: "Attach payments to forms or chat",
        description:
          "Set required deposit amounts on appointment types or add payment checkout blocks to your intake forms.",
      },
      {
        step: "4",
        title: "Receive payouts",
        description:
          "Collected funds flow directly into your Stripe account and transfer to your bank on Stripe's standard rolling schedule.",
      },
    ],
    faqs: [
      {
        question: "Does GPTForm charge additional transaction fees on top of Stripe?",
        answer:
          "No. GPTForm charges 0% platform transaction fees. You keep 100% of what you earn, paying only standard Stripe processing fees (e.g. 2.9% + 30¢ in the US).",
      },
      {
        question: "Is in-chat Stripe payment processing PCI compliant?",
        answer:
          "Yes. GPTForm utilizes Stripe's secure tokenized iframes (Stripe Elements). Credit card information never touches our servers, ensuring Level 1 PCI-DSS compliance.",
      },
      {
        question: "How fast do payouts reach my bank account?",
        answer:
          "Payouts are handled directly by Stripe according to your Stripe account settings (typically a 2-day rolling payout in the US and Europe).",
      },
      {
        question: "Can I accept payments from international customers in multiple currencies?",
        answer:
          "Yes. Stripe supports 135+ currencies and local payment methods worldwide. GPTForm automatically handles currency presentation based on your pricing settings.",
      },
    ],
  },
  {
    kind: "integration",
    slug: "zapier",
    titleTag: "Zapier Integration — Connect GPTForm to 6,000+ Apps",
    h1: "Connect GPTForm to 6,000+ business applications via Zapier",
    eyebrow: "Integration · Zapier Webhooks & Automation",
    metaDescription:
      "Connect GPTForm to HubSpot, Salesforce, Slack, Mailchimp, Airtable, and 6,000+ tools via Zapier. Trigger workflows on new leads, confirmed bookings, and paid invoices.",
    heroSubtitle:
      "Automate your entire business ecosystem. Connect GPTForm to your CRM, email marketing, team chat, and operational tools via Zapier. Trigger instant multi-step automations the second a lead qualifies or an appointment is booked.",
    icon: Zap,
    metrics: [
      { value: "6,000+", label: "Business applications connectable" },
      { value: "14", label: "Real-time native triggers & actions" },
      { value: "No-Code", label: "Visual automated workflow builder" },
    ],
    features: [
      {
        icon: Zap,
        badge: "Triggers",
        title: "14 Real-Time Native Triggers",
        description:
          "Fire Zaps instantly on New Lead Captured, Lead Qualified, Booking Created, Booking Rescheduled, Payment Collected, Invoice Paid, and Review Submitted.",
      },
      {
        icon: Code,
        title: "Create & Update GPTForm Records",
        description:
          "Actions allow external apps to create leads, register appointments, or update customer records inside GPTForm automatically.",
      },
      {
        icon: Globe,
        title: "Instant Slack & Teams Notifications",
        description:
          "Send instant alerts into specific Slack channels or Microsoft Teams when a hot lead qualifies or a high-value quote is accepted.",
      },
      {
        icon: Calendar,
        title: "HubSpot & Salesforce Bi-Directional Sync",
        description:
          "Sync qualified conversational leads, chat transcripts, and deal stages directly into your enterprise CRM without manual data entry.",
      },
      {
        icon: CreditCard,
        title: "Email Marketing List Enrollment",
        description:
          "Automatically add new contacts to targeted Mailchimp, ActiveCampaign, or Klaviyo marketing sequences based on their qualification tags.",
      },
      {
        icon: BookOpen,
        title: "Webhook Payloads with Full Transcripts",
        description:
          "Every Zapier event includes complete structured data fields and full conversation transcripts for comprehensive auditing and analytics.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Search for GPTForm on Zapier",
        description:
          "In your Zapier dashboard, click 'Create Zap' and search for the GPTForm integration.",
      },
      {
        step: "2",
        title: "Connect via API Key",
        description:
          "In GPTForm Settings → API, copy your private API key and paste it into the Zapier connection popup.",
      },
      {
        step: "3",
        title: "Select your trigger event",
        description:
          "Choose your trigger (e.g. 'New Lead Qualified' or 'Booking Created') and run a test to pull sample data.",
      },
      {
        step: "4",
        title: "Configure actions & publish",
        description:
          "Map data fields to your destination app (Slack, HubSpot, Airtable) and turn your Zap on.",
      },
    ],
    faqs: [
      {
        question: "Do I need a paid Zapier plan to connect with GPTForm?",
        answer:
          "You can get started on Zapier's free tier (which includes 100 tasks/month). For higher volumes or multi-step Zaps, Zapier offers affordable paid tiers.",
      },
      {
        question: "Which GPTForm events can trigger a Zapier workflow?",
        answer:
          "Native triggers include: New Lead Captured, Lead Qualified, Lead Disqualified, Booking Created, Booking Rescheduled, Booking Cancelled, Payment Received, Invoice Paid, Quote Accepted, and Review Collected.",
      },
      {
        question: "Can external apps create leads or bookings inside GPTForm?",
        answer:
          "Yes. GPTForm exposes actions in Zapier to Create Lead, Update Customer, and Create Booking from external forms or webhook sources.",
      },
      {
        question: "Is there any delay before Zapier workflows fire?",
        answer:
          "GPTForm triggers are webhook-based and execute instantaneously within seconds of an event completing.",
      },
    ],
  },
  {
    kind: "integration",
    slug: "quickbooks",
    titleTag: "QuickBooks Online Integration — Auto-Sync Invoices & Payments | GPTForm",
    h1: "Automatically sync GPTForm invoices and payments to QuickBooks",
    eyebrow: "Integration · QuickBooks Online",
    metaDescription:
      "Connect QuickBooks Online to GPTForm for automated invoice, customer, and payment synchronization. Eliminate manual double-entry and keep books audit-ready.",
    heroSubtitle:
      "Stop wasting hours manually entering invoices at month-end. GPTForm syncs every paid invoice, client record, and transaction fee to QuickBooks Online in real time — keeping your accounting flawless and audit-ready with zero manual effort.",
    icon: BookOpen,
    metrics: [
      { value: "100%", label: "Automated invoice & payment sync" },
      { value: "0", label: "Hours spent on manual double-entry" },
      { value: "QBO", label: "QuickBooks Online native OAuth" },
    ],
    features: [
      {
        icon: BookOpen,
        badge: "Auto-Sync",
        title: "Real-Time Paid Invoice Synchronization",
        description:
          "Every paid invoice generated through GPTForm chat, smart forms, or field apps automatically syncs into QuickBooks Online with itemized lines, taxes, and discounts.",
      },
      {
        icon: CreditCard,
        title: "Payment Method & Deposit Account Matching",
        description:
          "Card payments, Apple Pay, and deposits map cleanly to your designated QuickBooks bank and undeposited funds accounts for effortless 1-click reconciliation.",
      },
      {
        icon: Calendar,
        title: "Customer Record Auto-Creation & Deduplication",
        description:
          "Client profiles match against existing QuickBooks customers by email and phone number, updating records without generating confusing duplicates.",
      },
      {
        icon: Zap,
        title: "Sales Tax Code & Chart of Accounts Mapping",
        description:
          "Map individual service types and materials to your exact QuickBooks Chart of Accounts and local sales tax jurisdictions.",
      },
      {
        icon: Code,
        title: "Refunds & Credit Note Sync",
        description:
          "Customer refunds and partial credits processed in GPTForm automatically create matching Credit Memos in QuickBooks, maintaining perfect book balance.",
      },
      {
        icon: Globe,
        title: "Multi-Currency Exchange Rate Sync",
        description:
          "Honors your QuickBooks home currency settings and automatically records international transactions with appropriate exchange rates.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Connect QuickBooks Online",
        description:
          "In GPTForm Settings → Integrations → QuickBooks, click 'Connect to QuickBooks' and log in via secure Intuit OAuth.",
      },
      {
        step: "2",
        title: "Map accounts & tax codes",
        description:
          "Map your income accounts, default bank deposit accounts, and sales tax codes between GPTForm and QuickBooks.",
      },
      {
        step: "3",
        title: "Select sync rules",
        description:
          "Choose whether to sync all paid invoices or filter by minimum amounts, service lines, or customer tags.",
      },
      {
        step: "4",
        title: "Verify automatic posting",
        description:
          "Process a test transaction in GPTForm — it will appear inside QuickBooks Online within minutes.",
      },
    ],
    faqs: [
      {
        question: "Does this integration support QuickBooks Desktop or only QuickBooks Online?",
        answer:
          "GPTForm integrates natively with QuickBooks Online (QBO) via Intuit's cloud API. For QuickBooks Desktop, we recommend syncing via our Zapier integration.",
      },
      {
        question: "How quickly do paid invoices sync into QuickBooks Online?",
        answer:
          "Invoices sync in near real time, usually appearing in QuickBooks Online within 1 to 3 minutes of payment completion.",
      },
      {
        question: "What happens if a customer already exists in QuickBooks?",
        answer:
          "GPTForm checks existing customer records by email and phone number. If a match is found, the invoice is attached to the existing customer profile without creating duplicates.",
      },
      {
        question: "What if an invoice fails to sync due to a mapping error?",
        answer:
          "Any sync exceptions are logged in your Sync History dashboard with plain-English error descriptions. You can update the mapping and retry the sync with 1 click.",
      },
    ],
  },
];

export const allPlatforms: PlatformConfig[] = [...platforms, ...integrations];

export function getPlatformBySlug(slug: string): PlatformConfig | undefined {
  return allPlatforms.find((p) => p.slug === slug);
}

export function getPlatformsByKind(kind: PlatformKind): PlatformConfig[] {
  return allPlatforms.filter((p) => p.kind === kind);
}
