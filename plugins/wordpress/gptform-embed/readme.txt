=== GPTForm Embed ===
Contributors: fieseros
Tags: forms, ai forms, form builder, embed, gptform
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 7.2
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Embed AI-powered GPTForm forms on your WordPress site using a simple shortcode.

== Description ==

GPTForm Embed lets you embed forms created on [fieseros.com/gptform](https://fieseros.com/gptform) directly into your WordPress site. Use the `[gptform]` shortcode to place forms on any page, post, or sidebar widget.

**Features:**

* **AI-Powered Forms** — GPTForm generates high-converting forms with AI
* **Simple Shortcode** — `[gptform id="abc123"]` embeds any form
* **Two Embed Modes** — JavaScript (native rendering) or Iframe (fallback)
* **Theme Overrides** — Customize primary color, border radius, background
* **Auto-Resize** — Forms automatically adjust height to fit content
* **Sidebar Widget** — Place forms in your theme sidebars
* **Branding Control** — Show/hide "Powered by GPTForm"
* **Schema Caching** — 5-minute transient cache reduces API calls
* **Responsive** — Forms are mobile-friendly and responsive
* **Cross-Origin** — Forms submit directly to your GPTForm backend

== Installation ==

1. Upload the `gptform-embed` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings → GPTForm to configure your domain (default: https://fieseros.com)
4. Use the shortcode `[gptform id="YOUR_FORM_ID"]` on any page or post

== Usage ==

**Basic usage:**
```
[gptform id="abc123"]
```

**Using a form slug:**
```
[gptform slug="my-booking-form"]
```

**Advanced options:**
```
[gptform id="abc123" mode="iframe" height="600px" theme="dark" primary_color="#ff0000" branding="false"]
```

**Available attributes:**
* `id` — Form ID (from GPTForm dashboard)
* `slug` — Form slug (alternative to ID)
* `mode` — `js` (default, recommended) or `iframe`
* `theme` — `light` or `dark`
* `primary_color` — Hex color override (e.g. `#ff0000`)
* `border_radius` — CSS border radius (e.g. `8px`)
* `background_color` — Hex color override
* `height` — Minimum height (default: `500px`)
* `branding` — `true` (default) or `false`
* `redirect_url` — URL to redirect after submission
* `success_title` — Custom success message title
* `success_message` — Custom success message text

== Frequently Asked Questions ==

= Where do I find my Form ID? =

Log into your GPTForm dashboard at fieseros.com/gptform, open any form, and copy the form ID from the URL or embed settings.

= Does this work with caching plugins? =

Yes. The plugin uses WordPress transients (5-minute cache) for form schemas. Page caching plugins (WP Super Cache, W3 Total Cache) work fine — the embed.js SDK loads the form dynamically after page load.

= Can I embed multiple forms on one page? =

Yes. Use the shortcode multiple times with different form IDs.

== Changelog ==

= 1.0.0 =
* Initial release
* [gptform] shortcode with JS and iframe embed modes
* Sidebar widget for theme sidebars
* Settings page for domain and embed configuration
* 5-minute schema caching via transients
* Theme overrides (primary color, border radius, background)
* "Powered by GPTForm" branding toggle
