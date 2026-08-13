# Fieseros Superadmin Guide — Social Publishing & Brand Brain

This guide is for the **platform owner (superadmin)**. It walks you through everything you need to configure so that tenants can publish to social media and use the Brand Brain AI assistant.

> **Domain placeholder:** All examples below use `https://fieseros.com` as the application domain. Replace it with your actual production domain (e.g. `https://app.yourdomain.com`) everywhere it appears — especially in OAuth redirect URIs, which must match exactly.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Menu Management](#2-menu-management)
3. [Brand Brain Configuration](#3-brand-brain-configuration)
4. [Social Publishing — Platform Setup](#4-social-publishing--platform-setup)
   - 4.1 [Facebook + Instagram (Meta App)](#41-facebook--instagram-meta-app)
   - 4.2 [Google Business Profile](#42-google-business-profile)
   - 4.3 [LinkedIn](#43-linkedin)
   - 4.4 [Pinterest](#44-pinterest)
   - 4.5 [X (Twitter)](#45-x-twitter)
5. [Feature Flag Management](#5-feature-flag-management)
6. [Cron Job Setup](#6-cron-job-setup)
7. [Monitoring & Troubleshooting](#7-monitoring--troubleshooting)

---

## 1. Overview

Fieseros Social Publishing lets tenants publish posts to six platforms from one place:

| # | Platform | Adapter | OAuth Provider Key |
|---|----------|---------|--------------------|
| 1 | Facebook Page | `facebook` | `facebook` |
| 2 | Instagram Business | `instagram` | `instagram` |
| 3 | Google Business Profile | `googlebusiness` | `googlebusiness` |
| 4 | LinkedIn | `linkedin` | `linkedin` |
| 5 | Pinterest | `pinterest` | `pinterest` |
| 6 | X (Twitter) | `twitter` | `twitter` |

**Before tenants can use Social Publishing, the superadmin must:**

1. Register a developer application at each of the 5 platform providers (Meta covers both Facebook + Instagram, so it's 5 apps total).
2. Configure OAuth redirect URIs at each provider to point at your Fieseros domain.
3. Submit each app for review (timelines vary; LinkedIn's Marketing Developer Platform review can take up to 90 days — start it immediately).
4. Enter the App ID/Key and App Secret/Secret into Fieseros under **Superadmin Console → Social Publishing**.
5. Set up two cron jobs (publish-due + metrics-fetch).
6. (Optional) Use feature flags to gate platforms by subscription plan or hide them from specific tenants.

**Brand Brain** (the AI content context engine) is tenant self-service and requires no superadmin setup — but you can toggle it via feature flags (see §3 and §5).

---

## 2. Menu Management

The **Menu Management** page (Superadmin Console → Menu Management) controls which sidebar items appear for tenants. Use it to enable or hide features per-tenant or globally.

### 2.1 Global vs Tenant Scope

- **Global scope** — changes apply to ALL tenants. Use this to enable/disable a feature for the entire platform.
- **Tenant scope** — select a specific tenant from the dropdown to override the global setting for just that tenant.

Switch scope using the dropdown at the top of the page. The toggle grid below updates to reflect the selected scope.

### 2.2 Bulk Buttons — Enable all / Hide all / Reset

The three bulk-action buttons at the top of the toggle grid now use a **single bulk POST request** (previously they fired N concurrent PUTs, which caused lost-update races):

- **Enable all** — turns every menu item ON in one atomic operation.
- **Hide all** — turns every menu item OFF in one atomic operation.
- **Reset** — clears all tenant-level overrides and reverts to the global defaults.

The backend wraps each bulk update in a database transaction, so a failure rolls back the entire change — no partial states.

### 2.3 Individual Toggles (Optimistic UI)

Each menu item has its own switch. Clicking it:

1. Flips the switch **instantly** in the UI (optimistic update).
2. Fires a PUT to the backend in the background.
3. On success — stays flipped.
4. On error — rolls back to the previous state and shows a toast.

This means the UI never blocks on a single toggle. You can flip several toggles in quick succession without waiting.

### 2.4 Live Preview

The right panel shows a live preview of what the tenant's sidebar will look like with the current toggle state. Use it to confirm the menu looks right before moving on.

---

## 3. Brand Brain Configuration

### 3.1 What it does

Brand Brain is a per-tenant AI content context. Each tenant fills in a brand profile (business name, industry, target audience, brand voice/tone, services, USPs, competitors, forbidden phrases, default call-to-action). Fieseros uses this profile as system-prompt context for all AI content generation:

- Social media captions (`/api/social/ai-caption`)
- Message template generator (`/api/ai/template-generator`)
- WhatsApp template generator (`/api/ai/generate-whatsapp-template`)
- SMS suggested replies (`/api/ai/sms-suggested-reply`)
- Chat suggested replies (`/api/ai/suggested-reply`)

Brand Brain is **tenant self-service**. Tenants navigate to **Setup & Admin → Brand Brain**, fill in the form (or use the "AI Assist" button to auto-fill from their website URL), and save. The profile is then automatically injected into every AI call.

### 3.2 What the superadmin needs to do

**Nothing for setup.** There is no per-platform app to register, no OAuth flow, no credentials to enter. Brand Brain runs on Fieseros's existing AI infrastructure (z-ai-web-dev-sdk).

The only superadmin-side action is the **feature flag toggle** — see §5 for how to enable/disable Brand Brain globally or per-tenant.

### 3.3 How to enable/disable via feature flags

1. Go to Superadmin Console → Feature Flags (or Menu Management).
2. Locate the `brandBrain` menu item.
3. Toggle it ON to enable, OFF to disable.
4. The change is reflected in tenant sidebars within their next page load.

When disabled, tenants no longer see the "Brand Brain" menu item. Their existing BrandProfile data is preserved (not deleted) — re-enabling the flag restores access.

---

## 4. Social Publishing — Platform Setup

Each platform requires you to register a developer application at the provider, configure OAuth redirect URIs, request API permissions, and (in most cases) submit for review.

> **Important:** Use `https://fieseros.com` as a placeholder below. Replace every occurrence with your actual production domain. OAuth redirect URIs must match exactly — including trailing slashes, protocol (https), and case.

### 4.1 Facebook + Instagram (Meta App)

Facebook and Instagram share **one** Meta App. You configure it once and Fieseros uses it for both platforms (with different OAuth scopes).

**Prerequisites:** A Meta Developer account (free) at https://developers.facebook.com.

#### Step 1: Create the Meta App

1. Go to https://developers.facebook.com and log in.
2. Click **My Apps** → **Create App**.
3. App type: **Business**.
4. App name: `Fieseros Publishing` (or your preferred name).
5. App contact email: your support email.
6. Select or create a Business Manager account.
7. Click **Create App**. Complete the captcha if prompted.

#### Step 2: Add Products

1. In your Meta App dashboard, scroll to **Add Product**.
2. Find **Facebook Login** and click **Set Up**.
3. Find **Marketing API** and click **Set Up**.

#### Step 3: Get App ID and App Secret

1. Go to **Settings → Basic**.
2. Copy the **App ID** — you'll paste this into Fieseros.
3. Click **Show** next to **App Secret** and copy it.
4. (Optional) Upload an app icon — required for App Review.

#### Step 4: Configure OAuth Redirect URIs

1. In the left sidebar, click **Facebook Login → Settings**.
2. Under **Valid OAuth Redirect URIs**, add BOTH of these (replace `fieseros.com` with your domain):
   ```
   https://fieseros.com/api/oauth/facebook/callback
   https://fieseros.com/api/oauth/instagram/callback
   ```
3. Click **Save Changes**.

#### Step 5: Required Permissions / Scopes

Fieseros requests these scopes automatically during OAuth. They must be added to your app's review submission:

| Scope | Purpose |
|-------|---------|
| `pages_manage_posts` | Publish posts to Facebook Pages |
| `pages_read_engagement` | Read comments and engagement metrics |
| `pages_show_list` | List the user's Facebook Pages |
| `pages_read_user_content` | Read published posts |
| `instagram_content_publish` | Publish to Instagram Business accounts |

#### Step 6: Submit for App Review

1. Go to **App Review → Permissions and Features**.
2. For each of the 5 permissions above, click **Request Advanced Access**.
3. For each, provide:
   - A detailed description of how Fieseros uses the permission.
   - A screencast (Loom or YouTube) showing the user flow: a tenant connects their Facebook Page and publishes a post.
   - Your Privacy Policy URL.
   - Your Terms of Service URL.
4. Click **Submit for Review**.
5. Review typically takes **1–4 weeks**. You'll get an email when it's complete.

#### Step 7: Add Test Users (for testing during review)

While the app is in Development mode, only test users can grant the advanced permissions.

1. Go to **Roles → Test Users**.
2. Click **Add Test Users** (create new or add existing).
3. Log in to Fieseros with the test user's Facebook credentials to test the full connect → publish flow.
4. Test users can also be made admins of test Facebook Pages.

#### Step 8: Switch App to Live Mode

After review approval:

1. Go to **Settings → Basic**.
2. At the top, toggle **App Mode** from **Development** to **Live**.
3. You'll be asked to provide a Privacy Policy URL and Data Deletion Callback URL if you haven't already.

#### Step 9: Enter Credentials in Fieseros

1. Log in to Fieseros as superadmin.
2. Go to **Superadmin Console → Social Publishing**.
3. Find the **Facebook + Instagram** card.
4. Paste your **App ID** and **App Secret**.
5. Click **Save & Enable**.
6. The card status should change to **✓ Configured**.
7. Repeat the same credential entry is NOT needed for Instagram — Instagram shares the Meta App.

Tenants can now connect their Facebook Pages and Instagram Business accounts via **Content → Social Accounts**.

---

### 4.2 Google Business Profile

**Prerequisites:** A Google Cloud account and a verified Google Business Profile (for at least one test location).

#### Step 1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com.
2. Click the project selector at the top → **New Project**.
3. Project name: `Fieseros GBP Publishing`.
4. Click **Create**.

#### Step 2: Enable the Google Business Profile APIs

1. In the Cloud Console, go to **APIs & Services → Library**.
2. Search for **Google Business Profile API** → click **Enable**.
3. Search for **My Business Business Information API** → click **Enable**.
4. Search for **My Business Account Management API** → click **Enable**.

#### Step 3: Configure the OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**.
2. User type: **External** (or **Internal** if you're on a Google Workspace and only your org will use it).
3. Fill in:
   - App name: `Fieseros`
   - User support email: your support email
   - App logo (optional but recommended)
   - Application home page: `https://fieseros.com`
   - Application privacy policy link: your Privacy Policy URL
   - Application terms of service link: your Terms URL
   - Authorized domains: `fieseros.com`
4. Click **Save and Continue**.
5. On the **Scopes** step, add `business.manage` (Google Business Profile).
6. Click **Save and Continue**.
7. On the **Test users** step, add your own Google account email as a test user (needed while the app is in Testing status).
8. Click **Save and Continue**.

#### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Fieseros Web Client`.
5. Under **Authorized redirect URIs**, add:
   ```
   https://fieseros.com/api/oauth/googlebusiness/callback
   ```
6. Click **Create**.
7. Copy the **Client ID** and **Client Secret** — you'll paste these into Fieseros.

#### Step 5: Submit for Verification (if needed)

If your app will be used by more than 100 users, you must submit the OAuth consent screen for verification:

1. Go to **OAuth consent screen → Publishing status**.
2. Click **Push to Production**.
3. If Google requires verification (sensitive scopes), follow the on-screen steps to submit:
   - A verification video showing the user flow.
   - Your privacy policy.
   - A justification for the `business.manage` scope.
4. Verification can take **2–6 weeks**.

For testing only, the app stays in **Testing** mode and works for the test users you added.

#### Step 6: Enter Credentials in Fieseros

1. Log in to Fieseros as superadmin.
2. Go to **Superadmin Console → Social Publishing**.
3. Find the **Google Business Profile** card.
4. Paste your **Client ID** (App ID field) and **Client Secret** (App Secret field).
5. Click **Save & Enable**.
6. The card status should change to **✓ Configured**.

Tenants can now connect their GBP locations via **Content → Social Accounts**. Each location becomes a separate SocialAccount row.

---

### 4.3 LinkedIn

**Prerequisites:** A LinkedIn account (must be the admin of a LinkedIn Company Page if you want tenants to publish to company pages, not just personal profiles).

> **⚠️ START THIS IMMEDIATELY.** The **Marketing Developer Platform** product review can take up to **90 days**. Begin the process as soon as you decide to deploy Fieseros, even before other platforms are configured.

#### Step 1: Create a LinkedIn App

1. Go to https://www.linkedin.com/developers.
2. Click **Create App**.
3. Fill in:
   - App name: `Fieseros Publishing`
   - LinkedIn Page: select your company's LinkedIn Page (you must be an admin)
   - App logo
   - Privacy Policy URL
   - Terms of Use URL
4. Check the box to agree to the API Terms of Use.
5. Click **Create app**.

#### Step 2: Add Products

1. In your app dashboard, under **Products**, click **Add products**.
2. Add **Share on LinkedIn** (used for personal-profile publishing).
3. Add **Marketing Developer Platform** (used for company-page publishing and engagement metrics).

> The Marketing Developer Platform product requires review and approval before it works in production. **Submit the review request the same day you create the app.**

#### Step 3: Configure OAuth 2.0 Settings

1. In the app dashboard, click the **Auth** tab.
2. Under **Authorized redirect URLs for your app**, add:
   ```
   https://fieseros.com/api/oauth/linkedin/callback
   ```
3. Click **Update**.

#### Step 4: Collect Credentials

1. Go to the **Settings** tab.
2. Copy the **Client ID**.
3. Click **Show** next to **Primary Client Secret** and copy it.

#### Step 5: Request Scopes

Fieseros requests these scopes automatically during OAuth:

| Scope | Purpose |
|-------|---------|
| `w_member_social` | Post on behalf of the authenticated member |
| `rw_organization` | Read/write organization (company page) content |
| `r_organization_social` | Read engagement metrics on org posts |
| `r_member_social` | Read the member's own social activity |

For the `rw_organization` and `r_organization_social` scopes (Marketing Developer Platform), submit a review request:

1. Go to the **Products** tab → **Marketing Developer Platform**.
2. Fill in the use-case justification (how Fieseros publishes to company pages, who the users are, expected volume).
3. Submit. Review takes up to **90 days**.

While in review, you can use LinkedIn's **Test App** feature for development — it allows testing without waiting for review.

#### Step 6: Verify Your App's LinkedIn Page

1. In the app dashboard, click the **Settings** tab.
2. Under **LinkedIn Page verification**, click **Verify**.
3. Follow the prompts to verify that you control the LinkedIn Page associated with the app.

#### Step 7: Enter Credentials in Fieseros

1. Log in to Fieseros as superadmin.
2. Go to **Superadmin Console → Social Publishing**.
3. Find the **LinkedIn** card.
4. Paste your **Client ID** (App ID field) and **Client Secret** (App Secret field).
5. Click **Save & Enable**.
6. The card status should change to **✓ Configured**.

Until Marketing Developer Platform review is complete, tenants can publish to their **personal LinkedIn profile** only. Company-page publishing activates automatically once the review is approved.

---

### 4.4 Pinterest

**Prerequisites:** A Pinterest business account (free) at https://business.pinterest.com.

#### Step 1: Create a Pinterest Developer App

1. Go to https://developers.pinterest.com and log in with your Pinterest business account.
2. Click **My Apps** → **Connect app** (or **Create app**).
3. Fill in:
   - App name: `Fieseros Publishing`
   - Description: short description of what the app does
   - Privacy policy URL: your Privacy Policy URL
   - Terms of service URL: your Terms URL
4. Click **Create**.

#### Step 2: Configure Redirect URI

1. In your app dashboard, find the **Redirect URIs** section.
2. Add:
   ```
   https://fieseros.com/api/oauth/pinterest/callback
   ```
3. Click **Save**.

#### Step 3: Collect Credentials

1. In the app dashboard, copy the **App ID**.
2. Copy the **App Secret** (a.k.a. Client Secret).
3. Note the **Scopes** you want to request (see Step 4).

#### Step 4: Request Scopes

Fieseros requests these scopes automatically during OAuth:

| Scope | Purpose |
|-------|---------|
| `boards:read` | List the user's boards (for the default-board selector) |
| `pins:read` | Read pin metrics |
| `pins:write` | Create pins |
| `user_accounts:read` | Read the user's account info |

In Development mode (default), scopes work for the app owner. For production access (other Pinterest users):

1. Go to the app dashboard → **Scopes** tab.
2. Click **Request access** for each scope.
3. Provide a use-case description and screenshot of your Fieseros Pinterest connect flow.
4. Pinterest reviews scope requests on a rolling basis (typically **1–2 weeks**).

#### Step 5: Enter Credentials in Fieseros

1. Log in to Fieseros as superadmin.
2. Go to **Superadmin Console → Social Publishing**.
3. Find the **Pinterest** card.
4. Paste your **App ID** and **App Secret**.
5. Click **Save & Enable**.
6. The card status should change to **✓ Configured**.

---

### 4.5 X (Twitter)

**Prerequisites:** A Twitter/X account with a verified email address and phone number (Twitter requires both to create a developer app).

> **⚠️ Cost warning:** The Twitter API **Free tier** allows **1,500 posts/month total** across ALL Fieseros tenants. For production with more than a few tenants, consider the **Basic tier** ($200/month, 50,000 posts/month) or **Pro tier**. See https://developer.twitter.com/en/portal/products for current pricing.

#### Step 1: Register as a Twitter Developer

1. Go to https://developer.twitter.com.
2. Click **Developer Portal** → sign in with your Twitter account.
3. Complete the developer agreement and basic info form (use case description, country, organization name).

#### Step 2: Create an App

1. In the Developer Portal, go to **Projects & Apps** → **+ New Project** (or use the default project).
2. Add an App:
   - App name: `FieserosPublishing`
   - Click **Next**.
3. Save the **API Key** and **API Key Secret** (also called Consumer Key + Secret) — these are shown only once.

#### Step 3: Configure User Authentication Settings (OAuth 2.0)

1. In your app's **Settings** → **User authentication settings**, click **Set up**.
2. **App permissions:** set to **Read and Write** (so the app can post tweets on the user's behalf).
3. **Type of App:** select **Web App, Automated App or Bot**.
4. Fill in:
   - App name (if prompted again)
   - Callback URI / Redirect URL:
     ```
     https://fieseros.com/api/oauth/twitter/callback
     ```
   - Website URL: `https://fieseros.com`
5. Click **Save**.
6. Note the **OAuth 2.0 Client ID** and **Client Secret** (for confidential clients). If you set up a public client (PKCE-only), the Client Secret can be left empty in Fieseros.

#### Step 4: Request Scopes

Fieseros uses OAuth 2.0 with PKCE and requests these scopes automatically:

| Scope | Purpose |
|-------|---------|
| `tweet.read` | Read the user's tweets (for metrics) |
| `tweet.write` | Post tweets on the user's behalf |
| `users.read` | Read the user's profile info |
| `offline.access` | Get a refresh token so the user stays connected |

These scopes are available on all tiers (Free, Basic, Pro).

#### Step 5: Apply for Elevated Access (if needed)

The Free tier allows publish (POST) requests. If you need higher rate limits, apply for **Basic** ($200/month) or **Pro** in the Developer Portal → **Products**.

#### Step 6: Enter Credentials in Fieseros

1. Log in to Fieseros as superadmin.
2. Go to **Superadmin Console → Social Publishing**.
3. Find the **X (Twitter)** card.
4. Paste your **OAuth 2.0 Client ID** (App ID field) and **Client Secret** (App Secret field — leave blank if using PKCE public client).
5. Click **Save & Enable**.
6. The card status should change to **✓ Configured**.

---

## 5. Feature Flag Management

Feature flags let you control which platforms and features are available to which tenants, without redeploying code.

### 5.1 Enable/Disable Platforms Globally

1. Go to **Superadmin Console → Social Publishing**.
2. Each platform card has a top-right toggle.
3. Toggle ON to make the platform available; OFF to hide it everywhere.
4. Disabled platforms are not shown to tenants in Social Accounts, Post Composer, or Analytics.

### 5.2 Minimum Subscription Plan per Platform

You can gate each platform by subscription plan:

1. Go to **Superadmin Console → Feature Flags** (or **Plan Limits**).
2. Each platform has a `minPlan` field. Set one of:
   - `free` — available to all tenants
   - `starter` — Starter plan and above
   - `growth` — Growth plan and above
   - `pro` — Pro plan and above
3. Tenants on a lower plan see the platform greyed-out with an "Upgrade" CTA.

### 5.3 Hide Platforms from Specific Tenants

For one-off overrides (e.g., a tenant asked to be excluded, or you're beta-testing):

1. Go to **Superadmin Console → Menu Management**.
2. Switch scope to the specific tenant (tenant selector at the top).
3. Toggle the unwanted platform's menu item OFF.
4. The change applies only to that tenant; other tenants keep the global setting.
5. Use **Reset** to clear the override later.

### 5.4 Default Plan Gating (Reference)

The default minimum plans out of the box are:

| Menu Item | Default minPlan |
|-----------|-----------------|
| Social Accounts | `free` |
| Create Post | `growth` |
| Posts List | `growth` |
| Social Analytics | `growth` |
| Brand Brain | `free` |

Adjust these to match your business model.

---

## 6. Cron Job Setup

Fieseros has two cron endpoints that must be called on a schedule. Without them, **scheduled posts won't publish** and **engagement metrics won't update**.

We recommend [cron-job.org](https://cron-job.org) (free, reliable, no signup-of-credit-card) — but any cron service works (AWS EventBridge, GitHub Actions, Vercel Cron, etc.).

### 6.1 Get the Cron Token

The cron endpoints require a token query parameter that matches the server-side env var.

1. Find your `SOCIAL_PUBLISH_TOKEN` value in your deployment environment variables (set during initial deployment).
2. If it's not set, generate one (e.g., `openssl rand -hex 32`) and set it as the `SOCIAL_PUBLISH_TOKEN` env var in your hosting platform (Vercel, Railway, etc.).
3. Use this same token for BOTH cron endpoints.

> **Never expose this token publicly.** It bypasses auth on the cron endpoints. If compromised, rotate it immediately and update all cron jobs.

### 6.2 Cron Job 1 — Publish Scheduled Posts

- **Frequency:** every **1 minute**
- **URL:**
  ```
  https://fieseros.com/api/social/publish-due?token=YOUR_TOKEN
  ```
- **HTTP method:** GET
- **Timeout:** 30 seconds
- **Purpose:** picks up any posts whose `scheduledAt` has passed and weren't yet published, then publishes them via the platform adapter.

**cron-job.org config example:**
- URL: `https://fieseros.com/api/social/publish-due?token=YOUR_TOKEN`
- Schedule: `* * * * *` (every minute)
- Request method: `GET`
- Notify on failure: enable (email alerts)

### 6.3 Cron Job 2 — Fetch Engagement Metrics

- **Frequency:** every **15 minutes**
- **URL:**
  ```
  https://fieseros.com/api/social/metrics-fetch?token=YOUR_TOKEN
  ```
- **HTTP method:** GET
- **Timeout:** 60 seconds (metrics fetching is slower than publishing)
- **Purpose:** for each post published in the last 90 days, fetches the latest likes/comments/shares/impressions from each platform and saves a snapshot.

**cron-job.org config example:**
- URL: `https://fieseros.com/api/social/metrics-fetch?token=YOUR_TOKEN`
- Schedule: `*/15 * * * *` (every 15 minutes)
- Request method: `GET`
- Notify on failure: enable

### 6.4 Verify the Cron Jobs

After setup, verify both endpoints respond with HTTP 200:

```bash
curl -i "https://fieseros.com/api/social/publish-due?token=YOUR_TOKEN"
curl -i "https://fieseros.com/api/social/metrics-fetch?token=YOUR_TOKEN"
```

You should see `200 OK` with a small JSON body. A 401 means the token is wrong; a 404 means the routes aren't deployed.

---

## 7. Monitoring & Troubleshooting

### 7.1 How to check if a tenant's OAuth token expired

Per-account token state is stored on the `SocialAccount` row. To inspect:

1. Go to **Superadmin Console → Tenants** → select tenant.
2. Open the **Social Accounts** tab.
3. Each connected account shows:
   - Status (Active / Expired / Inactive)
   - Token expiry date
   - Last refresh date
4. Expired accounts show a **Reconnect** button the tenant must click (tokens are encrypted and can't be refreshed by the superadmin).

For programmatic checks, query the database directly:

```sql
SELECT platform, accountName, status, tokenExpiry
FROM SocialAccount
WHERE tenantId = 'TENANT_ID'
ORDER BY tokenExpiry DESC;
```

### 7.2 How to debug publish failures

When a post fails to publish, the failure reason is stored on the `SocialPost.publishResults` JSON column.

1. Go to **Superadmin Console → Tenants** → select tenant.
2. Open **Posts** tab → filter by status **Failed**.
3. Click a failed post to see the per-platform error message (e.g., `{"platform":"twitter","status":"error","error":"Rate limit exceeded (1500/month cap)"}`).
4. Common failure modes:
   - **Token expired** → tenant must reconnect the account.
   - **Image required** (Instagram, Pinterest) → tenant must add an image to the post.
   - **Caption too long** (Instagram max 2,200 chars; X max 280 chars) → tenant must shorten.
   - **Rate limit** (X Free tier 1,500/month) → upgrade plan or wait for reset.
   - **Account inactive** (platform revoked access) → tenant must reconnect.

### 7.3 How to view publish logs

Fieseros writes an audit log entry for every publish attempt via `logActivity()`.

1. Go to **Superadmin Console → Activity Log**.
2. Filter by action `social_post_publish` or `social_account_connect`.
3. Each entry includes the tenant ID, post ID, platform, and result.

For deeper debugging, check your hosting platform's server logs (Vercel Logs, Railway Logs, etc.) and filter by the relevant route path:
- `/api/social/publish`
- `/api/social/publish-due`
- `/api/oauth/{platform}/callback`

### 7.4 Common Issues & Solutions

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Tenant sees "Platform not available" | Feature flag disabled or plan too low | Enable the platform flag (§5.1) or upgrade tenant's plan (§5.2). |
| OAuth callback shows "redirect_uri_mismatch" | The redirect URI in the provider's app config doesn't match exactly | Compare the URI in the error message against what's configured at the provider. Must match exactly (protocol, host, port, path, trailing slash). |
| OAuth callback shows "invalid_state" | CSRF cookie expired or browser blocked third-party cookies | User should retry the connect flow in a normal (non-incognito) browser window. |
| Instagram connect shows "No Business account found" | Tenant's Instagram is a personal account or isn't linked to a Facebook Page | Convert IG to Business + link a FB Page (see tenant guide §3.2). |
| LinkedIn company-page publish fails | Marketing Developer Platform review not yet approved | Wait for review (up to 90 days). Personal-profile publishing still works. |
| X publish fails with "rate limit" | Tenant exceeded 1,500 posts/month Free-tier cap | Upgrade to Basic tier ($200/month) or wait for next month. |
| Scheduled posts never publish | Cron job 1 not running or token wrong | Verify cron config (§6.4). Check `SOCIAL_PUBLISH_TOKEN` env var. |
| Metrics don't update | Cron job 2 not running | Verify cron config (§6.4). Note some platforms have 24–48hr metric lag. |
| Tenant reconnects but still "expired" | Old SocialAccount row conflicts with new OAuth callback | Delete the old SocialAccount row, then have the tenant reconnect. |
| Pinterest pin published but no image | Pinterest requires image; tenant submitted text-only post | Pinterest always requires an image. Add validation in Post Composer (already enforced — but check if a draft bypassed it). |

### 7.5 Health Check Endpoint

For uptime monitoring, ping the following unauthenticated endpoint:

```
https://fieseros.com/api/health
```

Expected response: `200 OK` with a JSON body `{"status":"ok"}`. Set up monitoring (e.g., UptimeRobot, BetterUptime) on this URL.

### 7.6 Escalation Path

If a platform-specific issue can't be resolved through the steps above:

1. Check the platform's developer status page for outages:
   - Meta: https://status.meta.com
   - Google: https://www.google.com/appsstatus
   - LinkedIn: https://status.linkedin.com
   - Pinterest: no official status page — check the developer forum
   - X: https://status.twitterstat.us or https://api.twitterstat.us
2. Open a ticket with the platform's developer support.
3. Document the issue in your internal incident tracker with the relevant `SocialPost.id` and `SocialAccount.id`.

---

**End of Superadmin Guide.** For tenant-facing instructions, see `TENANT-SUPPORT.md`.
