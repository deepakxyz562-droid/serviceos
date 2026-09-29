# GPTForm Mobile App 📱

> **Never miss a customer, lead, or booking.**
> A dedicated mobile companion app for GPTForm subscribers, built with **React Native + Expo SDK 54**, **NativeWind**, and **Reanimated**.

---

## 1. Product Concept: Studio vs. Mobile

| Environment | Role | Primary Activities |
| :--- | :--- | :--- |
| **Desktop Web (GPTForm Studio)** | **Build & Configure** | Drag-and-drop form canvas, formula editor, conditional logic, AI agent document training, custom branding. |
| **Mobile App (GPTForm Mobile)** | **Operate & Respond** | 0s-lag push notifications, live chat takeover, 1-tap lead calling, daily appointments, floating voice AI Copilot. |

---

## 2. Navigation Architecture (5 Core Tabs)

1. **`Home` (`app/(tabs)/index.tsx`)**:
   - Daily KPI Grid: Leads, Conversations, Bookings, Human Requests.
   - **Needs Your Attention**: Urgent live chat waiting (`[Take Over Chat]`), AI knowledge gaps (`[Teach AI]`).
   - Recent activity feed.
2. **`Inbox` (`app/(tabs)/inbox.tsx`)**:
   - Multichannel filters: `[All]`, `[🤖 AI Active]`, `[💬 Live Chat]`, `[📱 WhatsApp]`, `[✉️ SMS]`.
   - Live status badges (`🔴 Human Requested`, `🟢 AI Active`, `🟣 Booked`).
   - **Chat Detail (`app/chat/[id].tsx`)**: Live message stream with **1-Tap Operator Takeover** and canned replies.
3. **`Leads` (`app/(tabs)/leads.tsx`)**:
   - Pipeline stages: `[🔥 New]`, `[Contacted]`, `[Won]`.
   - 1-tap phone dialer (`Linking.openURL('tel:...')`) and WhatsApp (`whatsapp://send`).
   - **Lead Dossier (`app/lead/[id].tsx`)**: Full form intake answers, AI qualification summary, budget.
4. **`Bookings` (`app/(tabs)/bookings.tsx`) — Calendly Command Center**:
   - **Timeline View**: Fast day switching between `[Today]`, `[Tomorrow]`, and `[This Week]`.
   - **Visual Slot Indicators**: Distinct cards for 🟢 Open Availability (AI intake ready) and 📅 Confirmed Bookings.
   - **Emergency Availability**: Master intake toggle + **`[ 🚫 Block Next 2 Hours ]`** instant button for field pros in transit or emergencies.
   - **1-Tap Share Booking Links**: Share active service links directly via WhatsApp, SMS, or native OS share sheet.
   - **Customer Booking Dossier**: Detailed sheet with intake form answers, deposit status, and 1-tap Call, WhatsApp, Reschedule, or Cancel actions.
5. **`More` (`app/(tabs)/more.tsx`)**:
   - Form performance cards (views, starts, conversions %, pause/share buttons).
   - AI Agent health & **"Teach AI in 10s"** card (answer unanswered questions to train the knowledge base).
   - Profile & account sign out.
6. **Push Notifications (`src/lib/notifications.ts`)**:
   - **Android Notification Channels**: Multi-channel segregation (`Urgent Alerts`, `New Leads`, `Bookings & Calendar`, `Live Chat`).
   - **Foreground Presentation**: Instant banners, sound, and badge updates when the app is active.
   - **Backend Token Sync**: Native Expo Push Token auto-subscribes to `/api/notifications/push/subscribe`.
   - **Deep Linking**: Notification response listener auto-routes taps directly to the relevant chat, lead, or booking.
7. **Floating AI Copilot (`src/components/copilot/floating-copilot.tsx`)**:
   - Persistent spring-animated button hovering over the tab bar.
   - 1-tap opens interactive voice dictation and prompt pills (*"Show today's leads"*, *"What questions couldn't my AI answer?"*).

---

## 3. How to Run & Develop

From the `gptform-mobile-app` directory:

```bash
cd gptform-mobile-app

# 1. Install dependencies (uses bun or npm)
bun install
# or: npm install

# 2. Start the Expo development server
bun start
# or: npm start

# 3. Run on iOS Simulator
bun run ios

# 4. Run on Android Emulator
bun run android

# 5. Run on Web (for instant browser preview)
bun run web
```

---

## 4. API & Backend Connection

- **Base URL:** Defined in `src/lib/constants.ts` (defaults to `https://fieseros.com` or local dev `http://localhost:3000`).
- **Authentication:** Communicates with existing Next.js backend using `Authorization: Bearer <jwt_token>` managed by `src/lib/auth.ts` (`expo-secure-store`).
