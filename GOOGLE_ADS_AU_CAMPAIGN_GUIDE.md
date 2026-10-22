# Google Ads Campaign Launch Guide — Australia (Tradies & AI Receptionist)

This guide walks you through activating your **₹20,000 Ad Credit Offer**, uploading the automated campaign package into Google Ads account **`271-036-1563`**, and verifying end-to-end conversion tracking.

---

## 1. Claim Your ₹20,000 Welcome Offer (Spend ₹20,000, Get ₹20,000 Free)

1. Open **[Google Ads](https://ads.google.com/)** and switch to account **`271-036-1563`**.
2. In the top navigation / left menu, click **Billing** → **Promotions**.
3. Click the blue plus **`+`** button to add a promotional code.
4. Paste your offer code:
   ```text
   9RG9D-PLRG4-CUC9
   ```
5. Click **Apply**.
   * *Status will change to "Active". As you run your Australian campaign and spend ₹20,000 within 60 days, Google automatically credits ₹20,000 back to your account balance.*

---

## 2. One-Click Campaign Import

You have two ready-to-import CSV files generated in the project root:
1. [`google-ads-campaign-au-tradies.csv`](file:///Users/deepakchandra/Downloads/serviceos/google-ads-campaign-au-tradies.csv) — Complete Campaign, 2 Ad Groups, 20 Keywords, 20 Negative Keywords, and 2 Responsive Search Ads.
2. [`google-ads-assets-au-tradies.csv`](file:///Users/deepakchandra/Downloads/serviceos/google-ads-assets-au-tradies.csv) — Sitelinks and Callout extensions.

### How to Upload via the Google Ads Web Interface:
1. In Google Ads (`271-036-1563`), click **Tools and settings** (wrench icon or left sidebar) → **Bulk actions** → **Uploads**.
2. Click the blue **`+`** button.
3. Under **Source**, select **Upload file**.
4. Choose [`google-ads-campaign-au-tradies.csv`](file:///Users/deepakchandra/Downloads/serviceos/google-ads-campaign-au-tradies.csv).
5. Click **Preview** to verify changes, then click **Apply**.
6. Repeat for [`google-ads-assets-au-tradies.csv`](file:///Users/deepakchandra/Downloads/serviceos/google-ads-assets-au-tradies.csv) to link Sitelinks & Callouts.

*Alternative*: If you use **Google Ads Editor** (desktop app), click **Account → Import → From file...**, select the CSV, review and click **Post**.

---

## 3. Campaign Specifications Summary

| Setting | Value |
| :--- | :--- |
| **Campaign Name** | `Search - AU - Tradies & AI Receptionist` |
| **Daily Budget** | ₹1,000 / day (~A$18/day — reaches ₹20,000 in ~20 days to trigger the ₹20,000 credit) |
| **Geographic Location** | **Australia** (*Target: Presence: People in or regularly in your targeted locations*) |
| **Language** | English |
| **Bidding Strategy** | Maximize Clicks (Max CPC limit: ₹120 / ~A$2.20) |
| **Ad Group 1** | `AI Receptionist Tradies AU` |
| **Ad Group 2** | `Field Service Software AU` |
| **Landing Page** | `https://fieseros.com/au` |
| **UTM Tracking** | `?utm_source=google&utm_medium=cpc&utm_campaign=...` |

---

## 4. Conversion Tracking Verification

Conversion tracking is permanently wired into:
* Tag Initialization: [`src/components/analytics/analytics.tsx`](file:///Users/deepakchandra/Downloads/serviceos/src/components/analytics/analytics.tsx) (`AW-2710361563` + GA4 `G-8BVRFDEXCS`).
* Conversion Hook: [`src/components/au/au-landing-page.tsx`](file:///Users/deepakchandra/Downloads/serviceos/src/components/au/au-landing-page.tsx) (`gtag('event', 'conversion', { send_to: 'AW-2710361563', value: 150.0, currency: 'AUD' })`).

### (Optional) Link GA4 to Google Ads:
For 100% cookieless attribution resilience:
1. In Google Ads, click **Tools and settings → Linked accounts**.
2. Select **Google Analytics (GA4) and Firebase**.
3. Link your GA4 property (`G-8BVRFDEXCS`).
4. In **Goals → Conversions → Summary**, click **New conversion action → Import → Google Analytics 4 properties**, and select **`generate_lead`**.
