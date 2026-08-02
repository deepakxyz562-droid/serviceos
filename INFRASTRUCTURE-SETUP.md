# Fieseros — Infrastructure Setup Guide

> **Complete checklist of everything you need to create/configure to run the Fieseros application in production.**
> 
> After the ServiceOS → Fieseros rebrand, these are the external services and accounts you need to set up.

---

## Table of Contents
1. [Domain & DNS](#1-domain--dns)
2. [Hosting (Vercel/Netlify)](#2-hosting-vercelnetlify)
3. [Database (Supabase)](#3-database-supabase)
4. [Email Service (AWS SES / Resend)](#4-email-service-aws-ses--resend)
5. [Payment Processing (PayPal + Creem)](#5-payment-processing-paypal--creem)
6. [SMS / WhatsApp (Twilio)](#6-sms--whatsapp-twilio)
7. [AI APIs (OpenAI / Anthropic / Gemini)](#7-ai-apis-openai--anthropic--gemini)
8. [Push Notifications (VAPID)](#8-push-notifications-vapid)
9. [Google OAuth & Places](#9-google-oauth--places)
10. [AI Voice / Vapi](#10-ai-voice--vapi)
11. [Realtime Service (WebSocket)](#11-realtime-service-websocket)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Post-Deploy Verification](#13-post-deploy-verification)

---

## 1. Domain & DNS

### What you need:
- **Primary domain:** `fieseros.com`
- **Wildcard subdomain:** `*.fieseros.com` (for multi-tenant: `{tenant}.fieseros.com`)
- **Admin subdomain:** `admin.fieseros.com`

### DNS Records to create (at your registrar / Cloudflare):

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | `@` | `<hosting-provider-IP>` | Root domain (fieseros.com) |
| CNAME | `www` | `fieseros.com` | WWW redirect |
| CNAME | `admin` | `fieseros.com` | Super-admin dashboard |
| CNAME | `*` | `fieseros.com` | Wildcard for tenant subdomains |
| MX | `@` | `<mail-provider-MX>` | Email routing |
| TXT | `@` | `v=spf1 include:<mail-provider> ~all` | SPF record |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; ...` | DMARC policy |

### SSL Certificate:
- **Vercel/Netlify:** Auto-provisioned (Let's Encrypt) for all domains added in dashboard
- **Self-hosted:** Use Caddy (auto-HTTPS) or certbot for wildcard cert

---

## 2. Hosting (Vercel/Netlify)

### Vercel (recommended for Next.js):
1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. **Add Domains:** Settings → Domains → Add `fieseros.com`, `www.fieseros.com`, `admin.fieseros.com`, `*.fieseros.com`
3. Vercel will show you the DNS records to add (auto-configures SSL)
4. **Environment Variables:** Add all vars from Section 12

### Netlify alternative:
1. [netlify.com](https://netlify.com) → Add new site → Import from GitHub
2. **Domain settings:** Add `fieseros.com` + configure wildcard
3. Note: Netlify doesn't support wildcard subdomains on free tier — use Vercel for multi-tenant

---

## 3. Database (Supabase)

### Create project:
1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `fieseros-production`
3. Set a strong database password
4. Choose region closest to your users

### Get credentials (Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### Get database connection (Settings → Database):
```
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
USE_SUPABASE_DB=true
```

### Run the rebrand migration:
After first deploy, go to **SQL Editor** → paste contents of `supabase-migration-rebrand.sql` → Run.

### Push Prisma schema:
```bash
bun run db:push
```

### Seed initial data:
```bash
bun run db:seed
```

---

## 4. Email Service (AWS SES / Resend)

The app supports **AWS SES** (production) and **Resend** (simpler setup). Pick one.

### Option A: AWS SES (recommended for volume)
1. Go to [AWS Console](https://aws.amazon.com) → SES → Verified identities
2. **Verify domain** `fieseros.com`:
   - Add the provided CNAME records (DKIM) to your DNS
   - Add SPF + DMARC records
3. **Request production access** (SES starts in sandbox mode — can only send to verified emails)
4. **Create SMTP credentials** or IAM API keys:
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_SNS_SENDER_ID=Fieseros   # optional, for SMS via SNS
```
5. **Create sender identities:**
   - `notifications@fieseros.com` (transactional)
   - `sales@fieseros.com` (sales)
   - `support@fieseros.com` (support)
   - `hello@fieseros.com` (marketing)

### Option B: Resend (simpler, for startups)
1. Go to [resend.com](https://resend.com) → Create account
2. **Verify domain** `fieseros.com` (add DNS records)
3. Get API key:
```
RESEND_API_KEY=re_...
```
4. Sender: `notifications@fieseros.com`

### Email inboxes to create (Google Workspace / Zoho / Cloudflare Email Routing):
Create these 12 inboxes (or forward all to one inbox):

| Email | Purpose |
|-------|---------|
| `hello@fieseros.com` | General inquiries |
| `sales@fieseros.com` | Sales / demo requests |
| `support@fieseros.com` | Customer support |
| `help@fieseros.com` | Help / FAQ |
| `admin@fieseros.com` | Admin / superadmin login |
| `legal@fieseros.com` | Legal notices |
| `privacy@fieseros.com` | Privacy / GDPR |
| `dpo@fieseros.com` | Data Protection Officer |
| `security@fieseros.com` | Security reports |
| `abuse@fieseros.com` | Abuse reports |
| `notifications@fieseros.com` | Transactional email sender |
| `demo@fieseros.com` | Demo accounts |

**Cheapest option:** Cloudflare Email Routing (free) → forward all 12 to one Gmail/Workspace inbox.

---

## 5. Payment Processing (PayPal + Creem)

### PayPal:
1. Go to [developer.paypal.com](https://developer.paypal.com) → My Apps & Credentials
2. Create a REST API app:
   - Name: `Fieseros Production`
   - Type: Merchant
3. Get credentials:
```
PAYPAL_CLIENT_ID=AY...
PAYPAL_CLIENT_SECRET=EL...
PAYPAL_MERCHANT_EMAIL=payments@fieseros.com
PAYPAL_SANDBOX=false   # true for testing
```
4. **Set webhook URL:** `https://fieseros.com/api/webhooks/paypal`
   - Events: `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `PAYMENT.SALE.COMPLETED`
   - Get Webhook ID: `PAYPAL_WEBHOOK_ID=WH-...`

### Creem (alternative billing — configured in superadmin, NOT env):
1. Go to [creem.io](https://creem.io) → Create account
2. Create API keys:
   - Test key: `creem_test_...` (for sandbox)
   - Live key: `creem_live_...` (for production)
3. Create webhook: URL = `https://fieseros.com/api/webhooks/creem`
   - Get webhook secret: `whsec_...`
4. **Configure in app:** Log in as superadmin → Settings → Billing → Enter Creem API key + webhook secret
   - Stored encrypted in DB (`Credential` table, key = `creem_billing`)

### Stripe (optional, if using Stripe Connect):
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
Webhook URL: `https://fieseros.com/api/webhooks/stripe`

---

## 6. SMS / WhatsApp (Twilio)

### Twilio for SMS:
1. Go to [twilio.com](https://twilio.com) → Create account
2. Get a phone number (SMS-enabled)
3. Get credentials:
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```
4. **Configure in app:** Superadmin → Settings → SMS → Enter Twilio credentials
   - Stored encrypted in DB

### WhatsApp Business API (Meta Cloud API):
1. Go to [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App
2. Type: Business → Add WhatsApp product
3. Get credentials:
```
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=fieseros_verify_token   # any string you choose
```
4. **Configure webhook:** `https://fieseros.com/api/whatsapp/webhook`
   - Verify token: must match `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to: `messages`, `message_status`, `message_delivered`, `message_read`
5. Add a test phone number, then submit for WhatsApp Business verification

---

## 7. AI APIs (OpenAI / Anthropic / Gemini)

The app supports multiple AI providers. Configure at least one.

### OpenAI (for GPT-4o, embeddings):
```
OPENAI_API_KEY=sk-proj-...
```
Get from [platform.openai.com](https://platform.openai.com) → API Keys

### Anthropic (for Claude):
```
ANTHROPIC_API_KEY=sk-ant-...
```
Get from [console.anthropic.com](https://console.anthropic.com) → API Keys

### Google Gemini (free tier available):
```
GEMINI_API_KEY=AIza...
```
Get from [aistudio.google.com](https://aistudio.google.com) → Get API Key

### OpenRouter (access multiple models via one API):
```
OPENROUTER_API_KEY=sk-or-...
```
Get from [openrouter.ai](https://openrouter.ai) → Keys

> **Note:** AI keys are read from env vars at runtime. The superadmin settings page can also store per-tenant keys in the DB for BYOK (bring your own key) flows.

---

## 8. Push Notifications (VAPID)

Web Push requires VAPID key pairs. Generate them:

### Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

### Set env vars:
```
VAPID_PUBLIC_KEY=BGa...
VAPID_PRIVATE_KEY=abc...
VAPID_SUBJECT=https://fieseros.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BGa...   # same as VAPID_PUBLIC_KEY, exposed to client
```

> **Critical:** These keys are used by `public/sw.js` to subscribe users to push. If you lose the private key, all existing subscriptions become invalid.

---

## 9. Google OAuth & Places

### Google OAuth (for Sign in with Google):
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → Create Project
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. **Authorized redirect URIs:**
   - `https://fieseros.com/api/auth/callback/google`
   - `https://admin.fieseros.com/api/auth/callback/google`
4. Get credentials:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Google Places API (for address autocomplete):
1. Same Google Cloud project → Enable **Places API**
2. Create API key:
```
GOOGLE_PLACES_API_KEY=AIza...
```
3. Restrict the key to your domain only (HTTP referrer restriction)

---

## 10. AI Voice / Vapi

For the AI Receptionist feature (voice calls):

### Vapi.ai:
1. Go to [vapi.ai](https://vapi.ai) → Create account
2. Get credentials:
```
VAPI_SERVER_URL=https://api.vapi.ai
VAPI_WEBHOOK_SECRET=...   # from webhook settings
```
3. **Create an assistant** in the Vapi dashboard → get assistant ID
4. **Configure webhook:** `https://fieseros.com/api/vapi/webhook`
5. **Configure in app:** Superadmin → AI Receptionist → Enter Vapi API key + assistant ID

---

## 11. Realtime Service (WebSocket)

The app uses a separate mini-service for WebSocket (socket.io) real-time updates.

### Start the realtime service:
```bash
cd mini-services/realtime-service
bun install
bun run dev   # runs on port 3001
```

### Env vars:
```
NEXT_PUBLIC_REALTIME_URL=/   # relative path; gateway handles port via XTransformPort
REALTIME_BROADCAST_URL=http://localhost:3001
REALTIME_INTERNAL_SECRET=generate-a-random-secret
```

> **Production:** Deploy the realtime service as a separate process/container. The Caddy gateway routes `/?XTransformPort=3001` to it.

---

## 12. Environment Variables Reference

Create a `.env` file (or set in Vercel/Netlify dashboard) with ALL of these:

```bash
# ─── Domain ───
NEXT_PUBLIC_APP_URL=https://fieseros.com

# ─── Database (Supabase) ───
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres
USE_SUPABASE_DB=true
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ─── Auth ───
JWT_SECRET=generate-64-char-hex-string
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=generate-64-char-hex-string

# ─── Email (AWS SES) ───
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
# OR Resend:
RESEND_API_KEY=re_...

# ─── Payments ───
PAYPAL_CLIENT_ID=AY...
PAYPAL_CLIENT_SECRET=EL...
PAYPAL_MERCHANT_EMAIL=payments@fieseros.com
PAYPAL_SANDBOX=false
PAYPAL_WEBHOOK_ID=WH-...

# ─── SMS / WhatsApp ───
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=fieseros_verify_token

# ─── AI APIs (at least one) ───
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# ─── Push Notifications ───
VAPID_PUBLIC_KEY=BGa...
VAPID_PRIVATE_KEY=abc...
VAPID_SUBJECT=https://fieseros.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BGa...

# ─── Google Places ───
GOOGLE_PLACES_API_KEY=AIza...

# ─── Cron ───
CRON_SECRET=generate-a-strong-random-secret

# ─── Realtime ───
NEXT_PUBLIC_REALTIME_URL=/
REALTIME_BROADCAST_URL=http://localhost:3001
REALTIME_INTERNAL_SECRET=generate-a-random-secret

# ─── Encryption (for storing credentials in DB) ───
ENCRYPTION_KEY=generate-32-byte-hex-string

# ─── Vapi (AI Voice) ───
VAPI_SERVER_URL=https://api.vapi.ai
VAPI_WEBHOOK_SECRET=...

# ─── Geocoding (Nominatim) ───
NOMINATIM_USER_AGENT=Fieseros/1.0
```

### Generate secrets:
```bash
openssl rand -hex 32   # for JWT_SECRET, CRON_SECRET, etc.
openssl rand -hex 16   # for ENCRYPTION_KEY
npx web-push generate-vapid-keys   # for VAPID keys
```

---

## 13. Post-Deploy Verification

After deploying, verify each service works:

| Check | How to verify |
|-------|---------------|
| Homepage loads | Visit `https://fieseros.com` — should show "Fieseros" branding |
| Admin subdomain | Visit `https://admin.fieseros.com` — should show login |
| Tenant subdomain | Create a tenant → visit `https://{slug}.fieseros.com` |
| Database | Log in as superadmin → see seeded data |
| Email | Superadmin → Settings → Email → Send test email |
| PayPal | Sign up for a paid plan → complete checkout |
| WhatsApp | Superadmin → WhatsApp → Send test message |
| Push notifications | Allow notifications → trigger a notification |
| Google login | Click "Sign in with Google" on login page |
| AI features | Dashboard → AI Assistant → ask a question |
| Cron jobs | Set up external cron (cron-job.org) hitting `/api/cron/*?secret=...` |
| Sitemap | Visit `https://fieseros.com/sitemap.xml` — all URLs should use fieseros.com |
| Robots | Visit `https://fieseros.com/robots.txt` |

### SEO setup (fresh start):
1. **Google Search Console:** Add `fieseros.com` as a property → verify (DNS TXT)
2. **Submit sitemap:** `https://fieseros.com/sitemap.xml`
3. **Bing Webmaster Tools:** Add property → submit sitemap
4. **IndexNow:** Already integrated — pings Bing/IndexNow on content changes

---

## Quick Start (Minimum Viable Setup)

To get the app running ASAP with basic features:

1. **Vercel** deploy (free tier) + add `fieseros.com` domain
2. **Supabase** (free tier) + run `bun run db:push` + `bun run db:seed`
3. **Resend** (free tier, 3000 emails/month) — for email
4. **PayPal Sandbox** — for payments (switch to live later)
5. **Google OAuth** — for login
6. **OpenAI** API key — for AI features (or Gemini free tier)
7. **VAPID keys** — for push notifications
8. **JWT_SECRET + CRON_SECRET + ENCRYPTION_KEY** — generate random strings

That's enough to launch. Add WhatsApp, Twilio SMS, Vapi voice, Stripe, Creem as you need them.

---

*Generated as part of the ServiceOS → Fieseros rebrand. All brand references now point to `fieseros.com`. Future brand changes only require editing `src/lib/brand.ts`.*
