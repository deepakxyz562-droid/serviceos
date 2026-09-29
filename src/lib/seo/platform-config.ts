import {
  LayoutTemplate,
  ShoppingCart,
  Globe,
  Code,
  Calendar,
  CreditCard,
  Zap,
  BookOpen,
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
    titleTag: "Fieseros for WordPress — AI Chat & Forms Plugin Alternative",
    h1: "Add AI chat & smart forms to your WordPress site",
    eyebrow: "Platform · WordPress",
    metaDescription:
      "Embed Fieseros AI chat agent and smart forms on any WordPress site in 60 seconds — no plugin, no bloat. Capture leads, book appointments, and collect payments with one snippet.",
    heroSubtitle:
      "No plugin conflicts, no PHP, no bloat. Paste one snippet into your WordPress header and the AI chat agent + smart forms are live — capturing leads and booking jobs 24/7.",
    icon: LayoutTemplate,
    metrics: [
      { value: "60s", label: "From snippet to live agent" },
      { value: "0", label: "Plugins to install" },
      { value: "All", label: "WP themes supported" },
    ],
    features: [
      {
        icon: Globe,
        badge: "Snippet",
        title: "One-Line Header Embed",
        description:
          "Drop the Fieseros embed script into your theme's <head> or a header-injection plugin. The AI chat widget loads on every page with zero impact on PageSpeed.",
      },
      {
        icon: Code,
        title: "Shortcode for Inline Forms",
        description:
          "Use [fieseros form=\"contact\"] shortcodes to embed smart forms inline in posts and pages — perfect for service request pages and quote forms.",
      },
      {
        icon: Calendar,
        title: "Booking Page Integration",
        description:
          "Embed a full booking page on /book or /schedule that shows real-time availability and lets customers self-book appointments directly from your WordPress site.",
      },
      {
        icon: CreditCard,
        title: "WooCommerce-Safe Payments",
        description:
          "Fieseros payment collection runs independently of WooCommerce — no conflict. Collect deposits and invoices via Stripe, Razorpay, or PayPal alongside your store.",
      },
      {
        icon: Zap,
        badge: "AI",
        title: "AI Chat on Every Page",
        description:
          "The AI agent greets visitors, qualifies leads, and books appointments on every WordPress page — blog posts, service pages, and the homepage alike.",
      },
      {
        icon: BookOpen,
        title: "Blog-Led SEO Capture",
        description:
          "Visitors reading your WordPress blog get the AI agent in the corner — turning SEO traffic into qualified leads instead of bounces.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your embed snippet",
        description:
          "From your Fieseros dashboard, click 'Embed' and copy the one-line <script> tag with your workspace ID.",
      },
      {
        step: "2",
        title: "Paste into WordPress header",
        description:
          "Add the snippet to Appearance → Theme Editor → header.php (before </head>), or use a header-injection plugin like 'Insert Headers and Footers'.",
      },
      {
        step: "3",
        title: "Publish & verify",
        description:
          "Save and visit any page. The AI chat widget appears in the bottom-right. Test it by sending a message.",
      },
      {
        step: "4",
        title: "Add inline forms (optional)",
        description:
          "Use the [fieseros] shortcode on any page or post to embed a smart form inline — contact, quote, or booking.",
      },
    ],
    faqs: [
      {
        question: "Do I need to install a WordPress plugin?",
        answer:
          "No. Fieseros uses a single embed script in your theme header — no plugin required. This avoids plugin conflicts, bloat, and the security risks of giving a third-party plugin access to your WordPress admin. You can also use a header-injection plugin if you'd rather not edit theme files.",
      },
      {
        question: "Will the chat widget slow down my WordPress site?",
        answer:
          "No. The Fieseros script is <15KB, loads asynchronously after first paint, and the chat widget is lazy-loaded when a visitor engages. It has no measurable impact on Core Web Vitals or PageSpeed scores.",
      },
      {
        question: "Does it work with page builders like Elementor and Divi?",
        answer:
          "Yes. The header embed works universally. For inline forms, you can use the shortcode in Elementor's Shortcode widget or Divi's Code module. The booking page can be embedded in an iframe on any page builder.",
      },
      {
        question: "Can I use Fieseros with WooCommerce?",
        answer:
          "Yes. Fieseros runs alongside WooCommerce without conflict. The AI chat captures leads and books services, while WooCommerce handles product sales. Payment collection is independent so there's no double-charging or gateway conflict.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "shopify",
    titleTag: "Fieseros for Shopify — AI Chat & Booking for Online Stores",
    h1: "Turn Shopify traffic into booked services",
    eyebrow: "Platform · Shopify",
    metaDescription:
      "Embed Fieseros AI chat and appointment booking on your Shopify store. Capture service leads, book installations, and collect deposits — no app install required.",
    heroSubtitle:
      "Your Shopify store sells products; Fieseros captures the service inquiries that products generate. The AI agent answers product questions, books installations, and collects deposits — all in one chat.",
    icon: ShoppingCart,
    metrics: [
      { value: "1-click", label: "Theme app embed" },
      { value: "+34%", label: "Service inquiry capture" },
      { value: "0", label: "Apps to install" },
    ],
    features: [
      {
        icon: ShoppingCart,
        badge: "Native",
        title: "Theme App Embed",
        description:
          "Enable Fieseros via Shopify's theme app embed — no code edits. Toggle on in your theme settings and the AI chat appears across your store.",
      },
      {
        icon: Calendar,
        title: "Installation Booking",
        description:
          "Customers buying a product that needs installation (appliances, HVAC units, smart home gear) can book the install in the same chat — no separate call.",
      },
      {
        icon: CreditCard,
        title: "Deposit Collection",
        description:
          "Collect installation deposits through Stripe or PayPal directly in the chat — separate from the Shopify checkout, no gateway conflict.",
      },
      {
        icon: Zap,
        badge: "AI",
        title: "Product Q&A Agent",
        description:
          "The AI answers product questions from your store catalog and knowledge base — 'does this fit my furnace?' — and routes complex questions to your team.",
      },
      {
        icon: Globe,
        title: "Service Landing Pages",
        description:
          "Create dedicated service pages on your Shopify store with embedded Fieseros booking forms — capturing both product buyers and service seekers.",
      },
      {
        icon: BookOpen,
        title: "Abandoned Cart Recovery",
        description:
          "When a customer abandons a cart, Fieseros can trigger an SMS follow-up offering help or a discount — recovering sales the standard email reminder misses.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Connect your store",
        description:
          "From the Fieseros dashboard, select Shopify and paste your store URL. We'll guide you through the OAuth connection.",
      },
      {
        step: "2",
        title: "Enable theme app embed",
        description:
          "In Shopify admin → Themes → Customize → App embeds, toggle Fieseros on. The AI chat widget appears across your store instantly.",
      },
      {
        step: "3",
        title: "Configure the agent",
        description:
          "Upload your product catalog and service knowledge base so the AI can answer product and service questions accurately.",
      },
      {
        step: "4",
        title: "Add booking forms (optional)",
        description:
          "Embed Fieseros booking forms on service landing pages using the Shopify page editor and a custom Liquid block.",
      },
    ],
    faqs: [
      {
        question: "Do I need to install a Shopify app?",
        answer:
          "No app install required. Fieseros uses Shopify's theme app embed system — you connect via OAuth and toggle the embed on in your theme settings. No Liquid edits, no app bloat, no monthly Shopify app fees.",
      },
      {
        question: "Does Fieseros conflict with Shopify checkout or payments?",
        answer:
          "No. Fieseros payment collection runs entirely separately from Shopify checkout. Product sales go through Shopify's gateway; service deposits and invoices go through Fieseros' connected gateways (Stripe, PayPal, Razorpay). They never interfere.",
      },
      {
        question: "Can the AI agent answer questions about my products?",
        answer:
          "Yes. Connect your product catalog and the AI answers product questions — specs, compatibility, availability — from your live data. For questions it can't answer, it escalates to your team with full context.",
      },
      {
        question: "Will this replace my customer support app?",
        answer:
          "It can. Fieseros handles 70%+ of common support questions (order status, returns, product info) via AI chat, and escalates the rest to your team in a shared inbox. Many stores replace Gorgias or Reamaze with Fieseros.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "wix",
    titleTag: "Fieseros for Wix — AI Chat & Smart Forms Embed",
    h1: "Add AI lead capture to your Wix website",
    eyebrow: "Platform · Wix",
    metaDescription:
      "Embed Fieseros AI chat agent and smart forms on any Wix website using the Velo code injection or custom HTML widget. Capture leads and book appointments in minutes.",
    heroSubtitle:
      "No Velo coding required. Paste the Fieseros snippet into Wix's custom code settings and the AI chat agent + smart forms are live — capturing leads from every page of your Wix site.",
    icon: Globe,
    metrics: [
      { value: "5 min", label: "Setup time on Wix" },
      { value: "All", label: "Wix templates supported" },
      { value: "24/7", label: "AI lead capture" },
    ],
    features: [
      {
        icon: Globe,
        badge: "Custom Code",
        title: "Header Code Injection",
        description:
          "Wix's Custom Code settings let you paste the Fieseros embed script into the site header — the AI chat widget loads on every page site-wide.",
      },
      {
        icon: Code,
        title: "HTML Widget for Inline Forms",
        description:
          "Embed smart forms inline using Wix's HTML iframe widget — perfect for contact pages, quote request forms, and booking widgets.",
      },
      {
        icon: Calendar,
        title: "Booking Page Integration",
        description:
          "Create a /book page on Wix with an embedded Fieseros booking form that shows real-time availability and lets customers self-schedule.",
      },
      {
        icon: Zap,
        badge: "AI",
        title: "AI Chat on Every Wix Page",
        description:
          "The AI agent greets visitors, qualifies leads, and books appointments on every Wix page — homepage, services, blog, and contact.",
      },
      {
        icon: CreditCard,
        title: "Wix Payments-Safe",
        description:
          "Fieseros payment collection runs independently of Wix Payments — collect deposits and invoices via Stripe or PayPal without conflict.",
      },
      {
        icon: BookOpen,
        title: "Wix Blog Lead Capture",
        description:
          "Visitors reading your Wix blog get the AI agent in the corner — converting content traffic into qualified leads instead of bounces.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your embed snippet",
        description:
          "From the Fieseros dashboard, copy the one-line embed <script> tag with your workspace ID.",
      },
      {
        step: "2",
        title: "Add to Wix Custom Code",
        description:
          "In Wix dashboard → Settings → Custom Code → Add new code, paste the snippet, set to load on all pages, place in header.",
      },
      {
        step: "3",
        title: "Publish & verify",
        description:
          "Save and publish your Wix site. The AI chat widget appears in the bottom-right corner. Test it by sending a message.",
      },
      {
        step: "4",
        title: "Add inline forms (optional)",
        description:
          "Use the HTML iframe widget on any Wix page to embed a smart form inline — contact, quote, or booking.",
      },
    ],
    faqs: [
      {
        question: "Do I need a Wix Velo subscription?",
        answer:
          "No. Fieseros uses Wix's Custom Code feature available on all paid Wix plans. You don't need Velo (Corvid) or developer mode — just paste the snippet into Settings → Custom Code.",
      },
      {
        question: "Will the chat widget work on the Wix mobile site?",
        answer:
          "Yes. The Fieseros widget is fully responsive and works on both desktop and mobile Wix sites. The chat button adapts to mobile screens and respects safe-area insets.",
      },
      {
        question: "Can I embed forms inline on Wix pages?",
        answer:
          "Yes. Use Wix's HTML iframe widget and paste the Fieseros form embed code. The form renders natively inside the widget with full styling and validation.",
      },
      {
        question: "Does this work with Wix Bookings?",
        answer:
          "Yes. Fieseros runs alongside Wix Bookings without conflict. Many customers use Fieseros for AI lead capture and replace Wix Bookings with Fieseros booking for the richer AI-powered experience and CRM integration.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "webflow",
    titleTag: "Fieseros for Webflow — AI Chat & Forms Embed",
    h1: "Supercharge your Webflow site with AI",
    eyebrow: "Platform · Webflow",
    metaDescription:
      "Embed Fieseros AI chat agent and smart forms on any Webflow site. Custom code in the project settings, embed widgets on any page — no CMS plan needed.",
    heroSubtitle:
      "Webflow's clean design deserves clean code. Paste the Fieseros snippet into Project Settings → Custom Code and the AI agent is live across your entire Webflow site — no embed bloat.",
    icon: Code,
    metrics: [
      { value: "Project-wide", label: "Custom code install" },
      { value: "0", label: "CMS plan required" },
      { value: "Embed", label: "Widgets on any page" },
    ],
    features: [
      {
        icon: Code,
        badge: "Custom Code",
        title: "Project-Wide Header Embed",
        description:
          "Paste the Fieseros script into Webflow Project Settings → Custom Code → <head>. The AI chat loads on every published page with no per-page setup.",
      },
      {
        icon: Globe,
        title: "Embed Widget for Inline Forms",
        description:
          "Use Webflow's Embed component to drop smart forms inline anywhere on a page — contact sections, service pages, footer CTAs.",
      },
      {
        icon: Calendar,
        title: "CMS-Driven Booking Pages",
        description:
          "Generate booking pages from Webflow CMS collection items — each service has its own page with an embedded Fieseros booking form.",
      },
      {
        icon: Zap,
        badge: "AI",
        title: "AI Chat on Every Page",
        description:
          "The AI agent greets visitors, answers questions, and books appointments on every Webflow page — homepage, CMS pages, and blog posts alike.",
      },
      {
        icon: CreditCard,
        title: "Webflow Ecommerce-Safe",
        description:
          "Fieseros payment collection runs independently of Webflow Ecommerce — collect service deposits via Stripe alongside product sales, no conflict.",
      },
      {
        icon: BookOpen,
        title: "Blog Lead Capture",
        description:
          "Webflow blog readers get the AI agent in the corner — converting content traffic into qualified leads instead of passive reads.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your embed snippet",
        description:
          "From the Fieseros dashboard, copy the one-line embed <script> tag with your workspace ID.",
      },
      {
        step: "2",
        title: "Add to Webflow Custom Code",
        description:
          "In Webflow Designer → Project Settings → Custom Code → <head>, paste the snippet. Save and publish your site.",
      },
      {
        step: "3",
        title: "Verify the chat widget",
        description:
          "Visit your published site. The AI chat button appears in the bottom-right corner. Test it by sending a message.",
      },
      {
        step: "4",
        title: "Add inline forms (optional)",
        description:
          "Drag an Embed component onto any page and paste the Fieseros form embed code for inline smart forms.",
      },
    ],
    faqs: [
      {
        question: "Do I need a Webflow CMS or Ecommerce plan?",
        answer:
          "No. Fieseros works on any Webflow plan including the basic site plan. Custom Code in Project Settings is available on all paid plans. CMS-driven booking pages require a CMS plan only if you want collection-driven booking pages.",
      },
      {
        question: "Does the embed work with Webflow's staging subdomain?",
        answer:
          "Yes. The Fieseros script loads on both your staging subdomain (webflow.io) and production custom domain. You can test the chat on staging before publishing to production.",
      },
      {
        question: "Can I use Fieseros forms instead of Webflow's native forms?",
        answer:
          "Yes. Fieseros smart forms have 200+ widgets, conditional logic, AI pre-fill, and CRM integration — far beyond Webflow's native forms. Use the Embed component to place them anywhere.",
      },
      {
        question: "Will the script affect my Webflow site's performance score?",
        answer:
          "No. The script is <15KB, loads asynchronously, and the chat widget is lazy-loaded. It has no measurable impact on Lighthouse performance or Core Web Vitals scores.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "squarespace",
    titleTag: "Fieseros for Squarespace — AI Chat & Forms Embed",
    h1: "Add AI lead capture to your Squarespace site",
    eyebrow: "Platform · Squarespace",
    metaDescription:
      "Embed Fieseros AI chat agent and smart forms on any Squarespace website using Code Injection. Capture leads, book appointments, and collect payments — no developer needed.",
    heroSubtitle:
      "Squarespace's Code Injection makes it easy. Paste the Fieseros snippet once and the AI chat agent is live across every page — capturing leads from your beautiful Squarespace design.",
    icon: Globe,
    metrics: [
      { value: "Code Injection", label: "Site-wide install" },
      { value: "All", label: "Squarespace templates" },
      { value: "24/7", label: "AI lead capture" },
    ],
    features: [
      {
        icon: Code,
        badge: "Code Injection",
        title: "Site-Wide Header Embed",
        description:
          "Squarespace's Code Injection (Settings → Advanced → Code Injection → Header) lets you paste the Fieseros script once — it loads on every page.",
      },
      {
        icon: Globe,
        title: "Code Block for Inline Forms",
        description:
          "Use Squarespace's Code Block on any page or post to embed Fieseros smart forms inline — contact, quote, and booking widgets.",
      },
      {
        icon: Calendar,
        title: "Booking Page Integration",
        description:
          "Create a /book page on Squarespace with an embedded Fieseros booking form showing real-time availability and self-scheduling.",
      },
      {
        icon: Zap,
        badge: "AI",
        title: "AI Chat on Every Page",
        description:
          "The AI agent greets visitors, qualifies leads, and books appointments across your entire Squarespace site — homepage, services, and blog.",
      },
      {
        icon: CreditCard,
        title: "Squarespace Commerce-Safe",
        description:
          "Fieseros payment collection runs independently of Squarespace Commerce — collect service deposits via Stripe alongside product sales, no conflict.",
      },
      {
        icon: BookOpen,
        title: "Blog Lead Capture",
        description:
          "Squarespace blog readers get the AI agent in the corner — converting content traffic into qualified leads instead of passive reads.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your embed snippet",
        description:
          "From the Fieseros dashboard, copy the one-line embed <script> tag with your workspace ID.",
      },
      {
        step: "2",
        title: "Paste in Code Injection",
        description:
          "In Squarespace → Settings → Advanced → Code Injection → Header, paste the snippet and save. Requires a Business plan or higher.",
      },
      {
        step: "3",
        title: "Publish & verify",
        description:
          "Visit your live Squarespace site. The AI chat button appears in the bottom-right corner. Test it by sending a message.",
      },
      {
        step: "4",
        title: "Add inline forms (optional)",
        description:
          "Add a Code Block to any page and paste the Fieseros form embed code for inline smart forms.",
      },
    ],
    faqs: [
      {
        question: "Which Squarespace plan do I need for Code Injection?",
        answer:
          "Code Injection requires a Business plan or higher (Commerce plans included). The Personal plan does not support Code Injection. If you're on Personal, upgrade to Business to use Fieseros — it's a one-time plan change with no site rebuild.",
      },
      {
        question: "Will the chat widget work on Squarespace's mobile view?",
        answer:
          "Yes. The Fieseros widget is fully responsive and works on desktop and mobile Squarespace sites. The chat button adapts to mobile screens and respects safe-area insets.",
      },
      {
        question: "Can I embed forms inline using Code Blocks?",
        answer:
          "Yes. Add a Code Block to any page or blog post and paste the Fieseros form embed code. The form renders natively with full styling, validation, and CRM integration.",
      },
      {
        question: "Does this conflict with Squarespace Scheduling (Acuity)?",
        answer:
          "No. Fieseros runs alongside Squarespace Scheduling without conflict. Many customers replace Scheduling with Fieseros booking for the AI-powered experience and unified CRM, but you can run both if you prefer.",
      },
    ],
  },
  {
    kind: "platform",
    slug: "html",
    titleTag: "Embed Fieseros AI Chat & Forms on Any HTML Website",
    h1: "Add AI chat & forms to any custom HTML site",
    eyebrow: "Platform · Custom HTML",
    metaDescription:
      "Embed Fieseros AI chat agent and smart forms on any custom HTML, PHP, or static website with one script tag. Works on any framework — React, Vue, Angular, plain HTML.",
    heroSubtitle:
      "Built your own site? No problem. One script tag in your <head> and the AI chat agent + smart forms are live — on any framework, any host, any stack. Framework-agnostic by design.",
    icon: Code,
    metrics: [
      { value: "1 tag", label: "Single script embed" },
      { value: "Any", label: "Framework or stack" },
      { value: "<15KB", label: "Async, lazy-loaded" },
    ],
    features: [
      {
        icon: Code,
        badge: "Universal",
        title: "One Script Tag in <head>",
        description:
          "Paste a single <script> tag into your HTML <head> and the AI chat widget loads on every page. Works on static HTML, PHP, React, Vue, Angular, Svelte — any stack.",
      },
      {
        icon: Globe,
        title: "iframe Forms Anywhere",
        description:
          "Embed smart forms inline using a one-line iframe snippet — drop it into any HTML page, post, or template where you need a form.",
      },
      {
        icon: Calendar,
        title: "Hosted Booking Page",
        description:
          "Don't want to build a booking page? Use Fieseros' hosted booking page at /book/[your-slug] — link to it from any site, no embed needed.",
      },
      {
        icon: Zap,
        badge: "AI",
        title: "AI Chat on Every Page",
        description:
          "The AI agent greets visitors, answers questions, and books appointments on every page of your custom site — regardless of how it's built.",
      },
      {
        icon: CreditCard,
        title: "Framework-Safe Payments",
        description:
          "Fieseros payment collection runs in an isolated iframe — no conflict with your site's framework, payment system, or checkout. Stripe, PayPal, Razorpay supported.",
      },
      {
        icon: BookOpen,
        title: "SPA & SSR Compatible",
        description:
          "The embed works on client-side rendered SPAs (React, Vue) and server-rendered sites (Next.js, Nuxt) alike — the widget attaches after hydration without route-change issues.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Copy your embed snippet",
        description:
          "From the Fieseros dashboard, copy the one-line <script> tag with your workspace ID and the chat widget config.",
      },
      {
        step: "2",
        title: "Paste into your HTML <head>",
        description:
          "Add the <script> tag to your HTML <head> before </head>. For SPAs, add it to your root layout or index.html template.",
      },
      {
        step: "3",
        title: "Deploy & verify",
        description:
          "Deploy your site. Visit any page — the AI chat button appears in the bottom-right corner. Test it by sending a message.",
      },
      {
        step: "4",
        title: "Add inline forms (optional)",
        description:
          "Embed smart forms inline using the one-line iframe snippet anywhere in your HTML where you need a form.",
      },
    ],
    faqs: [
      {
        question: "Does the embed work on React, Vue, and Angular SPAs?",
        answer:
          "Yes. The Fieseros script attaches to the DOM after load and survives client-side route changes in React, Vue, Angular, and Svelte SPAs. For server-rendered frameworks (Next.js, Nuxt, SvelteKit), add the script to your root layout.",
      },
      {
        question: "Will the script slow down my custom-built site?",
        answer:
          "No. The script is <15KB, loads asynchronously after first paint, and the chat widget is lazy-loaded when a visitor engages. It has no measurable impact on Core Web Vitals or Lighthouse performance scores.",
      },
      {
        question: "Can I customize the chat widget's appearance?",
        answer:
          "Yes. Configure the widget position, color, greeting text, button style, and branded avatar from the Fieseros dashboard — no code changes. Advanced users can override via data attributes on the script tag.",
      },
      {
        question: "Does it work on static site generators like Hugo or Astro?",
        answer:
          "Yes. Add the script tag to your base template (Hugo's baseof.html, Astro's Layout.astro, Eleventy's base layout). The widget renders on every generated static page.",
      },
    ],
  },
];

export const integrations: PlatformConfig[] = [
  {
    kind: "integration",
    slug: "google-calendar",
    titleTag: "Google Calendar Integration — Two-Way Sync | Fieseros",
    h1: "Sync Fieseros bookings with Google Calendar",
    eyebrow: "Integration · Google Calendar",
    metaDescription:
      "Connect Google Calendar to Fieseros for two-way sync. Personal appointments block availability, Fieseros bookings appear in Google Calendar, and customers see real-time free slots.",
    heroSubtitle:
      "Stop double-booking yourself. Fieseros syncs two ways with Google Calendar — your personal appointments block availability automatically, and every Fieseros booking lands on your Google Calendar instantly.",
    icon: Calendar,
    metrics: [
      { value: "2-way", label: "Calendar sync" },
      { value: "Real-time", label: "Availability updates" },
      { value: "Multi-cal", label: "Sync per technician" },
    ],
    features: [
      {
        icon: Calendar,
        badge: "2-Way",
        title: "Bidirectional Sync",
        description:
          "Fieseros bookings appear on Google Calendar instantly, and Google Calendar events block Fieseros availability — no double-booking, ever.",
      },
      {
        icon: Globe,
        title: "Per-Technician Calendar Sync",
        description:
          "Each technician connects their own Google Calendar. Personal appointments, dentist visits, and kid pickups automatically block their Fieseros availability.",
      },
      {
        icon: Zap,
        title: "Real-Time Availability",
        description:
          "Customers see real-time free slots on the booking page — updated the moment a Google Calendar event is added, edited, or removed.",
      },
      {
        icon: CreditCard,
        title: "Google Meet Auto-Generated",
        description:
          "Virtual appointments get a Google Meet link auto-generated and included in the booking confirmation — no manual link sharing.",
      },
      {
        icon: Code,
        title: "Event Color Coding",
        description:
          "Fieseros bookings use distinct Google Calendar event colors per service type — so you can see at a glance whether today is installs, repairs, or consults.",
      },
      {
        icon: BookOpen,
        title: "Shared Team Calendars",
        description:
          "Connect a shared Google Calendar (e.g., 'Company Dispatch') and Fieseros reads company-wide events alongside each tech's personal calendar.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Connect Google Calendar",
        description:
          "In Fieseros → Settings → Integrations → Google Calendar, click Connect and authorize with your Google account via OAuth.",
      },
      {
        step: "2",
        title: "Select calendars to sync",
        description:
          "Choose which Google Calendars to read (primary, shared, per-technician) and which to write Fieseros bookings to.",
      },
      {
        step: "3",
        title: "Set sync direction",
        description:
          "Configure two-way sync (recommended) or one-way. Set which event types block availability and how far in advance to sync.",
      },
      {
        step: "4",
        title: "Book & verify",
        description:
          "Book a test appointment in Fieseros — it appears on Google Calendar within seconds. Add a Google Calendar event and confirm it blocks the slot.",
      },
    ],
    faqs: [
      {
        question: "How fast does Google Calendar sync with Fieseros?",
        answer:
          "Fieseros bookings appear on Google Calendar within 5-10 seconds via the Google Calendar API push notifications. Google Calendar events block Fieseros availability in near real-time — typically under 30 seconds.",
      },
      {
        question: "Can each technician sync their own Google Calendar?",
        answer:
          "Yes. Each technician connects their personal Google Calendar via OAuth. Their personal appointments (dentist, kid pickups, etc.) automatically block their Fieseros availability — no manual blackout entry.",
      },
      {
        question: "Does this work with shared team Google Calendars?",
        answer:
          "Yes. You can connect a shared Google Calendar (e.g., 'Dispatch' or 'Company Events') alongside each technician's personal calendar. Fieseros reads both and combines them into each tech's availability.",
      },
      {
        question: "Will past Google Calendar events be imported?",
        answer:
          "No. Fieseros only syncs future events to avoid polluting your CRM with historical data. You can manually import past appointments as customer history if needed via CSV import.",
      },
    ],
  },
  {
    kind: "integration",
    slug: "stripe",
    titleTag: "Stripe Integration — Accept Payments & Subscriptions | Fieseros",
    h1: "Collect payments with Stripe",
    eyebrow: "Integration · Stripe",
    metaDescription:
      "Connect Stripe to Fieseros to accept cards, Apple Pay, Google Pay, and ACH. Collect deposits, send invoices, set up subscriptions, and reconcile automatically — in one platform.",
    heroSubtitle:
      "Stripe is the gold standard for online payments. Connect it to Fieseros in one click and accept cards, Apple Pay, Google Pay, and ACH — for deposits, invoices, and recurring billing, all reconciled automatically.",
    icon: CreditCard,
    metrics: [
      { value: "1-click", label: "OAuth connection" },
      { value: "All", label: "Payment methods" },
      { value: "Auto", label: "Invoice reconciliation" },
    ],
    features: [
      {
        icon: CreditCard,
        badge: "Stripe",
        title: "Cards, Apple Pay, Google Pay",
        description:
          "Accept Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay, and ACH bank transfers through Stripe — customers pay however they want.",
      },
      {
        icon: Calendar,
        title: "Deposits at Booking",
        description:
          "Require a Stripe deposit to lock in appointments. Refundable per your cancellation policy — protecting revenue and committing the customer.",
      },
      {
        icon: Zap,
        title: "Instant Invoice Links",
        description:
          "Send branded Stripe-backed invoice links by SMS + email. Customers pay from their phone in 30 seconds — no login, no app, no friction.",
      },
      {
        icon: Globe,
        title: "Recurring Subscriptions",
        description:
          "Set up Stripe subscriptions for maintenance contracts, monthly service plans, and membership tiers. Auto-charge on schedule, auto-reconcile in Fieseros.",
      },
      {
        icon: Code,
        title: "Auto-Reconciliation",
        description:
          "Every Stripe payment — card, ACH, refund — auto-reconciles against the matching Fieseros invoice. No end-of-month spreadsheet wrangling.",
      },
      {
        icon: BookOpen,
        title: "Stripe Connect for Marketplaces",
        description:
          "Marketplace operators use Stripe Connect to split payments between the platform and service providers — with built-in KYC and 1099 generation.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Connect Stripe",
        description:
          "In Fieseros → Settings → Payments → Stripe, click Connect and authorize via Stripe OAuth. No API keys to copy — fully secure.",
      },
      {
        step: "2",
        title: "Configure payment options",
        description:
          "Choose which payment methods to accept (cards, Apple Pay, ACH), set deposit requirements, and configure cancellation/refund policies.",
      },
      {
        step: "3",
        title: "Send your first invoice",
        description:
          "Create an invoice in Fieseros and send it by SMS + email. The customer gets a Stripe-backed pay link and pays in 30 seconds.",
      },
      {
        step: "4",
        title: "Verify reconciliation",
        description:
          "Check that the payment auto-marks the invoice paid and reconciles in your Fieseros reports. Payouts hit your bank on Stripe's standard 2-day schedule.",
      },
    ],
    faqs: [
      {
        question: "Do I need a separate Stripe account?",
        answer:
          "Yes, you need a Stripe account (free to create at stripe.com). Fieseros connects via OAuth so your Stripe dashboard, payouts, and statements remain in Stripe. Fieseros never sees or stores your card details — Stripe handles all PCI compliance.",
      },
      {
        question: "What are the Stripe transaction fees?",
        answer:
          "Stripe's standard fees apply (2.9% + 30¢ per card transaction in the US, varies by country). Fieseros charges no additional payment processing fees on top of Stripe — you only pay Stripe's fees plus your Fieseros subscription.",
      },
      {
        question: "How fast do I get my money with Stripe?",
        answer:
          "Stripe payouts typically arrive in your bank account within 2 business days (US), or instantly to your Stripe card. Payout timing is controlled by your Stripe account settings, not Fieseros.",
      },
      {
        question: "Can I use Stripe alongside other payment gateways?",
        answer:
          "Yes. Fieseros supports 33 gateways. You can connect Stripe, PayPal, and Razorpay simultaneously and route payments by currency, region, or service type — for example, Stripe for USD and Razorpay for INR.",
      },
    ],
  },
  {
    kind: "integration",
    slug: "zapier",
    titleTag: "Zapier Integration — Connect Fieseros to 6,000+ Apps",
    h1: "Connect Fieseros to 6,000+ apps via Zapier",
    eyebrow: "Integration · Zapier",
    metaDescription:
      "Use Zapier to connect Fieseros to 6,000+ apps — QuickBooks, HubSpot, Slack, Airtable, and more. Trigger Zaps on new leads, bookings, payments, and completed jobs.",
    heroSubtitle:
      "Don't see a native integration? Zapier fills the gap. Connect Fieseros to QuickBooks, HubSpot, Slack, Airtable, Mailchimp, and 6,000+ other apps — trigger Zaps on leads, bookings, payments, and job completions.",
    icon: Zap,
    metrics: [
      { value: "6,000+", label: "Apps connectable" },
      { value: "12", label: "Native Fieseros triggers" },
      { value: "No-code", label: "Visual Zap builder" },
    ],
    features: [
      {
        icon: Zap,
        badge: "Triggers",
        title: "12 Native Triggers",
        description:
          "Fire Zaps on new lead, lead qualified, booking created, job completed, payment received, invoice paid, review collected, and 5 more — no polling.",
      },
      {
        icon: Code,
        title: "Actions to Create Records",
        description:
          "Create leads, bookings, and customers in Fieseros from other apps — add a lead from a Typeform submission or a HubSpot form fill.",
      },
      {
        icon: Globe,
        title: "QuickBooks Accounting Sync",
        description:
          "Send paid Fieseros invoices to QuickBooks automatically via Zapier — no manual double entry, no end-of-month reconciliation headaches.",
      },
      {
        icon: Calendar,
        title: "Slack & Teams Notifications",
        description:
          "Get instant Slack or Microsoft Teams pings when a hot lead comes in, a job is completed, or a payment fails — keep the whole team in the loop.",
      },
      {
        icon: CreditCard,
        title: "HubSpot & Salesforce CRM Sync",
        description:
          "Sync Fieseros leads and customers to HubSpot or Salesforce for marketing automation, while Fieseros handles the operational CRM and dispatch.",
      },
      {
        icon: BookOpen,
        title: "Mailchimp & ActiveCampaign",
        description:
          "Add new Fieseros leads to Mailchimp or ActiveCampaign lists automatically for email marketing campaigns and newsletter sequences.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Connect Fieseros to Zapier",
        description:
          "In Zapier, search for 'Fieseros' and connect using your API key (available in Fieseros → Settings → API). OAuth-style connection.",
      },
      {
        step: "2",
        title: "Pick a trigger",
        description:
          "Choose a Fieseros trigger — 'New Lead', 'Lead Qualified', 'Booking Created', 'Payment Received' — based on what should start your Zap.",
      },
      {
        step: "3",
        title: "Pick an action app",
        description:
          "Choose the destination app — QuickBooks, HubSpot, Slack, Airtable — and configure the action (create record, send message, etc.).",
      },
      {
        step: "4",
        title: "Test & turn on",
        description:
          "Test the Zap with a sample Fieseros event, confirm the action fires in the destination app, then turn the Zap on. It runs automatically from now on.",
      },
    ],
    faqs: [
      {
        question: "Do I need a Zapier account to use this integration?",
        answer:
          "Yes, you need a Zapier account (free tier supports 100 tasks/month). For higher volume, Zapier's paid tiers scale to thousands of tasks. Many customers find Fieseros' native integrations (Stripe, Google Calendar, QuickBooks) cover most needs without Zapier.",
      },
      {
        question: "Which Fieseros events can trigger a Zap?",
        answer:
          "12 triggers: New Lead, Lead Qualified, Lead Disqualified, Booking Created, Booking Rescheduled, Job Completed, Payment Received, Invoice Paid, Review Collected, Customer Created, Deal Won, and Deal Lost. More triggers are added regularly.",
      },
      {
        question: "Is there a delay in Zapier triggers firing?",
        answer:
          "Zapier polls Fieseros for new events every 1-5 minutes on the free tier (instant on paid tiers via webhooks). For time-critical workflows (hot lead alerts), use Fieseros' native Slack/Teams SMS notifications instead of Zapier.",
      },
      {
        question: "Can I create records in Fieseros from other apps via Zapier?",
        answer:
          "Yes. Fieseros exposes 'Create Lead', 'Create Booking', and 'Create Customer' actions in Zapier. Submit a Typeform, Calendly, or HubSpot form and create the lead in Fieseros automatically.",
      },
    ],
  },
  {
    kind: "integration",
    slug: "quickbooks",
    titleTag: "QuickBooks Integration — Sync Invoices & Payments | Fieseros",
    h1: "Sync Fieseros invoices with QuickBooks",
    eyebrow: "Integration · QuickBooks",
    metaDescription:
      "Connect QuickBooks Online to Fieseros for automatic invoice and payment sync. Every paid Fieseros invoice posts to QuickBooks — no double entry, no reconciliation headaches.",
    heroSubtitle:
      "Stop re-typing invoices into QuickBooks at month-end. Fieseros syncs every paid invoice and payment to QuickBooks Online automatically — your books are always up to date, zero double entry.",
    icon: BookOpen,
    metrics: [
      { value: "Auto", label: "Invoice & payment sync" },
      { value: "0", label: "Double entry required" },
      { value: "QBO", label: "QuickBooks Online" },
    ],
    features: [
      {
        icon: BookOpen,
        badge: "Auto-Sync",
        title: "Paid Invoices to QuickBooks",
        description:
          "Every Fieseros invoice marked paid posts to QuickBooks Online automatically — with line items, tax, and customer info — no manual entry.",
      },
      {
        icon: CreditCard,
        title: "Payment Method Mapping",
        description:
          "Fieseros payment methods (Stripe card, cash, check, ACH) map to the correct QuickBooks payment accounts — so deposits reconcile cleanly.",
      },
      {
        icon: Calendar,
        title: "Customer Auto-Creation",
        description:
          "New Fieseros customers auto-create as QuickBooks customers — matched by email or phone to avoid duplicates.",
      },
      {
        icon: Zap,
        title: "Tax & Category Mapping",
        description:
          "Map Fieseros service types to QuickBooks income accounts and tax codes. Every invoice hits the right books category automatically.",
      },
      {
        icon: Code,
        title: "Refund & Credit Sync",
        description:
          "Refunds and credit notes in Fieseros post to QuickBooks as credit memos — keeping your books and your operational system in perfect sync.",
      },
      {
        icon: Globe,
        title: "Multi-Currency Support",
        description:
          "Fieseros honors QuickBooks' home currency and posts invoices in the correct currency with exchange rates — for international service businesses.",
      },
    ],
    installSteps: [
      {
        step: "1",
        title: "Connect QuickBooks Online",
        description:
          "In Fieseros → Settings → Integrations → QuickBooks, click Connect and authorize via Intuit OAuth. No API keys to manage.",
      },
      {
        step: "2",
        title: "Map accounts & taxes",
        description:
          "Map Fieseros service types to QuickBooks income accounts, and Fieseros payment methods to QuickBooks payment accounts.",
      },
      {
        step: "3",
        title: "Sync historical (optional)",
        description:
          "Choose to back-sync the last 30/90 days of paid Fieseros invoices to QuickBooks, or start fresh from today.",
      },
      {
        step: "4",
        title: "Verify in QuickBooks",
        description:
          "Mark a test invoice paid in Fieseros and confirm it appears in QuickBooks Online within minutes with correct accounts and tax mapping.",
      },
    ],
    faqs: [
      {
        question: "Does this work with QuickBooks Desktop or only QuickBooks Online?",
        answer:
          "Fieseros integrates with QuickBooks Online (QBO) natively. QuickBooks Desktop requires the QuickBooks Web Connector or a Zapier-based sync. Most service businesses have migrated to QBO for cloud access — if you're on Desktop, we recommend migrating or using Zapier.",
      },
      {
        question: "How fast do invoices sync to QuickBooks?",
        answer:
          "Paid Fieseros invoices post to QuickBooks Online within 1-5 minutes via the QBO API. The sync is near real-time — you'll see invoices in QuickBooks before your bookkeeper asks for them.",
      },
      {
        question: "Can I choose which invoices sync to QuickBooks?",
        answer:
          "Yes. You can sync all paid invoices, or filter by service type, amount, or customer tag. For example, sync only invoices over $500, or exclude internal/test customers.",
      },
      {
        question: "What happens if an invoice fails to sync?",
        answer:
          "Failed syncs (e.g., a deleted QuickBooks customer) appear in the Sync Log with the error. You can retry the sync after fixing the issue in QuickBooks. No data is lost — the invoice remains in Fieseros until successfully synced.",
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
