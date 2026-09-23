# GPTForm Embed — Shopify App

Embed AI-powered GPTForm forms on your Shopify store. Add forms to product
pages, cart pages, or any page using the Shopify theme editor.

## Installation

### Method 1: Shopify CLI (recommended)

```bash
# Install Shopify CLI (requires Node.js 18+)
npm install -g @shopify/cli @shopify/theme

# Clone this repo or copy the gptform-embed folder
cd gptform-embed

# Deploy the app extension to your store
shopify app deploy
```

### Method 2: Manual Liquid Snippet

1. Copy `snippets/gptform-embed.liquid` to your theme's `snippets/` folder
2. Copy `blocks/gptform_form.liquid` to your theme's `sections/` or `blocks/` folder
3. The block will appear in the theme editor under "Forms" category

## Usage

### Theme Editor (drag-and-drop)

1. Go to **Online Store → Themes → Customize**
2. Add a section to any page
3. Click "Add block" → select "GPTForm Embed"
4. Enter your Form ID in the block settings
5. Customize theme, colors, and branding

### Liquid Template (manual)

Add this to any `.liquid` file (e.g., `product.liquid`, `cart.liquid`):

```liquid
{% render 'gptform-embed', form_id: 'abc123' %}
```

With options:

```liquid
{% render 'gptform-embed',
  form_id: 'abc123',
  mode: 'iframe',
  theme: 'dark',
  primary_color: '#ff0000',
  height: '600px',
  branding: false
%}
```

### Using a form slug instead of ID:

```liquid
{% render 'gptform-embed', form_slug: 'my-booking-form', theme: 'dark' %}
```

## Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `form_id` | string | — | GPTForm form ID (from dashboard) |
| `form_slug` | string | — | Form slug (alternative to form_id) |
| `mode` | string | `js` | `js` (native) or `iframe` (fallback) |
| `theme` | string | — | `light` or `dark` |
| `primary_color` | string | — | Hex color override (e.g. `#ff0000`) |
| `border_radius` | string | — | CSS border radius (e.g. `8px`) |
| `background_color` | string | — | Hex background color override |
| `height` | string | `500px` | Min height (iframe mode) |
| `branding` | boolean | `true` | Show "Powered by GPTForm" |
| `redirect_url` | string | — | URL to redirect after submission |
| `success_title` | string | — | Custom success title |
| `success_message` | string | — | Custom success message |

## Features

- **Theme Editor Block** — Drag-and-drop forms onto any page
- **Liquid Snippet** — Manual embedding in `.liquid` templates
- **JS Embed Mode** — Native rendering via GPTForm Embed SDK
- **Iframe Fallback** — No-JS fallback via `<noscript>` tag
- **Theme Overrides** — Customize colors, border radius, background
- **Auto-Resize** — Forms auto-adjust height to fit content
- **Responsive** — Forms are mobile-friendly
- **Cross-Origin** — Forms submit to fieseros.com backend
- **Branding Toggle** — Show/hide "Powered by GPTForm"

## Requirements

- A free GPTForm account at [fieseros.com/gptform](https://fieseros.com/gptform)
- Shopify store with theme editing access
- No app installation required for the Liquid snippet method

## Support

- Documentation: [fieseros.com/gptform/docs](https://fieseros.com/gptform/docs)
- Email: support@fieseros.com
