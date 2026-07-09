# FitAI Owner Web

Gym-owner **PWA** — the mobile app's gym-management features on the web, so owners on **iPhone** can use everything via Safari/Chrome (Add to Home Screen) without an iOS App Store build. Talks to the same backend as the app (`fitai-backend` on Render).

## Features
- Phone/email **OTP login** (same approval-gating as the app's Admin chip)
- Dashboard: stats, today's check-ins, gym switcher + All-Gyms view
- Members: search, infinite scroll, add (with photo), status, detail page
- Payments: mark paid (plan presets), custom/next due date, fee buckets (overdue/today/upcoming)
- Cashbook: month/today views, income/expense entries
- Staff: add, mark present, statuses, granular permissions, attendance history
- Reports: monthly / 3-month, printable
- Gym: edit hours (multi-slot), fee plans, details; printable wall QR
- **Web Push notifications** (VAPID) — same events as the app: new member, payment, check-in, status change

## Notifications on iOS
iOS Safari delivers web push **only to installed PWAs** (iOS 16.4+): Share → **Add to Home Screen** → open the installed app → More → **Enable Push Notifications**.

## Env
- `NEXT_PUBLIC_API_URL` — optional; defaults to the live Render backend.

Backend (Render) needs `WEB_PUSH_PUBLIC_KEY` + `WEB_PUSH_PRIVATE_KEY` (VAPID pair) for push.

## Dev
```bash
npm install
npm run dev
```

Deploys on **Vercel** from `main`.
