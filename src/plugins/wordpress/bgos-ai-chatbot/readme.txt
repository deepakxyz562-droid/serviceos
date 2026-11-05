=== BGOS AI Chatbot ===
Contributors: deepakchandra076, deepakchandra
Donate link: https://fieseros.com
Tags: chatbot, ai, customer service, live chat, booking, appointment booking, leads, woocommerce
Requires at least: 5.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connect your WordPress site to BGOS AI Agent for 24/7 customer support, smart lead qualification, appointment booking, and knowledge base sync.

== Description ==

**BGOS AI Chatbot** transforms your WordPress site into a 24/7 autonomous customer service and sales agent. 

Unlike basic rule-based chatbots that frustrate visitors with rigid menus, BGOS is powered by intelligent generative AI agents trained directly on your business knowledge, website pages, FAQs, and product catalog.

Whether you run a local service business (salon, automotive repair, medical clinic, plumbing), a professional agency (legal, accounting, marketing), or an e-commerce store (WooCommerce), your AI assistant answers inquiries instantly, schedules appointments into your calendar, and captures qualified leads while you sleep.

### 🌟 Key Features & Substantial Innovation (Guideline 18)

* **Autonomous Appointment Booking**: Visitors can check availability, select a time slot, and book consultations directly inside the chat — synchronized live with your business calendar.
* **1-Click WordPress Knowledge Base Crawler**: Automatically crawls and syncs your published WordPress pages, blog posts, and FAQs into the AI agent's memory with zero manual data entry.
* **WooCommerce AI Sales Assistant**: Intelligently recommends products, answers shipping and return policy questions, and assists shoppers through checkout.
* **Smart Lead Qualification**: Automatically captures visitor names, emails, phone numbers, and service requirements and logs them into your CRM.
* **Instant 60-Second Setup**: Enter your Agent ID and your AI chat bubble goes live across your entire website immediately.
* **Custom Branding & Styling**: Match your website's exact brand colors, choose left or right bubble placement, and set custom welcome greetings.
* **Page-Specific Visibility Rules**: Easily hide the chat widget on checkout, cart, or private client portals, or hide it for logged-in administrators.
* **Shortcodes & Page Builder Friendly**: Use `[bgos_chat]` to embed inline chat interfaces into Elementor, Divi, Gutenberg, or custom landing pages.
* **Human Handoff & WhatsApp Support**: Seamlessly transition complex inquiries to your staff or continue the conversation on WhatsApp.

### 🛡️ 100% Free Plugin & Zero Trialware (Guidelines 5 & 6)

This plugin is 100% free and open-source software (GPLv2+). There are **no artificial feature restrictions, no time-limited trials, no paywalls, and no disabled buttons** in this plugin code. All built-in plugin features — including the floating chat widget, shortcode embedding, styling controls, page display rules, and WordPress content synchronizer — are completely unlocked.

### 🔌 External Cloud Service Notice (Third-Party Disclosure)

This plugin connects your WordPress site to the **BGOS AI Cloud Service** (hosted at `https://fieseros.com` or your configured BGOS instance). 

* **Service Purpose**: The plugin acts as a bridge. The cloud service securely powers the large language model completions, vector search for your website knowledge base, appointment calendar synchronization, and lead notification delivery.
* **What Data Is Sent**:
  1. *Website Content (when Knowledge Sync is triggered by admin)*: Published page titles, URLs, and text content to build your custom business knowledge base.
  2. *Chat Messages (when visitors chat)*: Visitor queries and conversation text sent to generate AI answers and execute booking requests.
* **Terms of Service**: [https://fieseros.com/terms](https://fieseros.com/terms)
* **Privacy Policy**: [https://fieseros.com/privacy](https://fieseros.com/privacy)

A BGOS account or Agent ID is required to connect to the cloud AI service. You can start with our generous free tier (no credit card required) directly at [https://fieseros.com](https://fieseros.com).

== Installation ==

1. Log into your WordPress admin dashboard (`wp-admin`).
2. Navigate to **Plugins > Add New**.
3. Search for **BGOS AI Chatbot** and click **Install Now**.
4. Click **Activate**.
5. Go to **Settings > BGOS AI Chatbot** in your admin menu.
6. Enter your **Agent ID / Slug** (available from your BGOS Dashboard under *AI Agents > Embed*).
7. Click **Save Settings** — your AI chatbot is now live on your site!

### Manual Installation via ZIP
1. Download `bgos-ai-chatbot.zip`.
2. Go to **Plugins > Add New > Upload Plugin**.
3. Select the `.zip` file and click **Install Now**, then **Activate**.

== Frequently Asked Questions ==

= Do I need a BGOS account to use this plugin? =
Yes. The plugin connects to the BGOS cloud platform where your AI agent, knowledge base, and booking calendar are securely hosted. You can create a free account at https://fieseros.com.

= Will the chatbot slow down my website? =
No. The widget script is loaded asynchronously (`async`) and non-blocking from our high-speed global CDN. It executes after your website's critical content has finished rendering.

= Can I customize the colors and greeting text? =
Yes! Inside **Settings > BGOS AI Chatbot**, you can pick your primary brand color, select whether the chat bubble appears on the bottom-right or bottom-left, and customize the greeting text.

= Can I hide the chatbot on specific pages? =
Yes. You can enter specific page IDs or URLs (such as `/cart/` or `/checkout/`) in the Excluded Pages field to prevent the bubble from displaying there.

= How do I embed the chat inside a page rather than a floating bubble? =
You can use the shortcode `[bgos_chat]` in any post, page, or page builder widget (Elementor, Divi, Gutenberg). You can also specify height: `[bgos_chat height="650px"]`.

= Can the bot speak multiple languages? =
Yes. The AI agent automatically understands and replies in over 95 languages, matching the language your visitor speaks.

== Screenshots ==

1. screenshot-1.png: Live AI Chatbot with floating bubble and automated appointment booking.
2. screenshot-2.png: WordPress admin settings panel with 1-click connection and live preview.
3. screenshot-3.png: One-click WordPress Knowledge Base sync to train the AI on your pages.
4. screenshot-4.png: Inline chatbot embedded into a page using the [bgos_chat] shortcode.

== Changelog ==

= 1.0.0 =
* Initial release on WordPress.org.
* Floating AI chat widget with customizable brand colors and positioning.
* Autonomous appointment booking workflow.
* Shortcode `[bgos_chat]` for inline page embedding.
* 1-Click Knowledge Base synchronizer for published pages, posts, and WooCommerce products.
* Page exclusion and administrator visibility controls.

== Upgrade Notice ==

= 1.0.0 =
Initial official release of BGOS AI Chatbot for WordPress.
