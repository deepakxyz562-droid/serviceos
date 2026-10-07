# QuoteFlow Mobile (React Native + Expo)

Mobile client for the QuoteFlow app. Consumes the same Next.js backend as the web PWA.

## Status (Phase 1)

- ✅ Auth (email/password — auto-creates account if email is new)
- ✅ Business onboarding (name, contact, currency, tax)
- ✅ Bottom tab navigation (Home, Quotes, Invoices, Customers, Settings)
- ✅ Customer CRUD (list + create + detail)
- ✅ Quote list + detail (read-only — full builder arrives Phase 3+)
- ✅ Invoice list + detail (read-only — full builder arrives Phase 6)
- ⏳ AI quote generation (Phase 4)
- ⏳ Manual quote builder (Phase 3)
- ⏳ Quote→Invoice one-tap conversion (Phase 6)
- ⏳ PDF generation (Phase 5+)
- ⏳ Voice input (Phase 4)

## Run locally

### 1. Start the Next.js backend

In the project root:

```bash
bun run dev
```

The backend must be reachable from your device/emulator. See "Configure API URL" below.

### 2. Install mobile dependencies

```bash
cd mobile
npm install
# or: bun install
```

### 3. Configure API URL

Edit `src/api/client.ts`:

```ts
// For iOS Simulator (Next.js dev server on host's localhost):
const HOST = "localhost";

// For Android Emulator (10.0.2.2 maps to host's localhost):
const HOST = "10.0.2.2";

// For real device (your machine's LAN IP):
const HOST = "192.168.x.y";
```

The Next.js dev server must accept connections from this host. By default `bun run dev` only binds to localhost. To accept LAN connections, start it with:

```bash
bun run dev -- -H 0.0.0.0
```

### 4. Start the Expo dev server

```bash
npx expo start
```

- Press `i` to launch in iOS Simulator (requires Xcode).
- Press `a` to launch in Android Emulator (requires Android Studio).
- Or scan the QR code with the Expo Go app on your phone (must be on the same Wi-Fi as this machine, and `HOST` must be your LAN IP).

### 5. Test the auth flow

Use any email/password — if the email is new, the backend auto-creates an account.

## Architecture

```
mobile/
├── app/                  # expo-router file-based routes
│   ├── _layout.tsx       # Root layout (bootstrap + token check)
│   ├── index.tsx         # Redirects to /auth or /(tabs)/home
│   ├── auth.tsx          # Sign in / register
│   ├── onboarding.tsx    # First-run business setup
│   ├── customer-form.tsx # New/edit customer
│   ├── quote-create.tsx  # Phase 1 placeholder (full flow in Phase 3-4)
│   ├── invoice-create.tsx# Phase 1 placeholder (full flow in Phase 6)
│   ├── customer/[id].tsx # Customer detail
│   ├── quote/[id].tsx    # Quote detail
│   ├── invoice/[id].tsx  # Invoice detail
│   └── (tabs)/
│       ├── _layout.tsx   # Tab bar
│       ├── home.tsx
│       ├── quotes.tsx
│       ├── invoices.tsx
│       ├── customers.tsx
│       └── settings.tsx
├── src/
│   ├── api/client.ts     # Authenticated fetch wrapper + SecureStore
│   ├── store/app.ts      # Zustand store (token, user, business, active tab)
│   └── lib/format.ts     # Currency formatting
├── app.json              # Expo config (permissions for mic + camera)
├── babel.config.js
├── metro.config.js
├── tsconfig.json
└── package.json
```

## Auth model

The mobile app uses the shared Fieseros access-token and rotating refresh-token flow. Tokens are stored in `expo-secure-store`; API requests send the short-lived access token as `Authorization: Bearer <token>`, and the client rotates the refresh token after an unauthorized response.

This is intentionally separate from NextAuth's cookie-based session so the mobile app doesn't need a WebView or shared cookie storage.

## Permissions

- `RECORD_AUDIO` — required for Phase 4 voice quote input
- `NSMicrophoneUsageDescription` — required for iOS mic access
- `NSCameraUsageDescription` — required for Phase 5+ photo capture (planned V2)
