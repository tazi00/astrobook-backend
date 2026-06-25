# AGENTS.md — Astrobook

> This file is for AI coding agents (Claude Code, Cursor, Copilot, etc.).
> Read this fully before writing any code.

---

## Project Overview

**Astrobook** is a role-based mobile app connecting users with astrologers for paid consultation sessions via video or voice call, with real-time in-session chat and file sharing. Astrologers can also post content for users to discover.

- **Platform:** React Native + Expo (Dev Client) — iOS & Android
- **Team:** Inevelop Ventures
- **Version:** MVP 2.0 — Fresh Start

---

## Roles

Single app — two roles determined at registration:

| Role | Description |
|---|---|
| `USER` | Browse astrologers, book sessions, join sessions, view posts, rate/review |
| `ASTROLOGER` | Create services, set availability, create posts, join sessions, view bookings |

Role is stored in JWT. Navigation changes based on role.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native + Expo Dev Client |
| Backend | Fastify (TypeScript) |
| ORM | Drizzle ORM |
| Database | PostgreSQL on Railway |
| Auth | Custom JWT + MSG91 OTP + Google OAuth |
| Video / Voice | Agora RTC |
| In-session Chat | Agora RTM |
| Payments | Razorpay |
| File Storage | Cloudinary |
| Job Scheduling | BullMQ + Redis |
| Notifications | Expo Push Notifications |
| Cart Storage | AsyncStorage (local, no backend cart table) |

---

## Repositories

Two separate repos — no monorepo.

| Repo | Description |
|---|---|
| `astrobook-server` | Fastify backend |
| `astrobook-mobile` | React Native + Expo frontend |

---

## Backend Structure — `astrobook-server/src/`

```
src/
├── db/
│   ├── schema/
│   │   ├── user.ts
│   │   ├── astrologer.ts
│   │   ├── service.ts
│   │   ├── availability.ts
│   │   ├── booking.ts
│   │   ├── payment.ts
│   │   ├── session.ts
│   │   ├── message.ts
│   │   ├── post.ts
│   │   └── review.ts
│   ├── index.ts           ← DB connection + export all schemas
│   └── migrations/
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.schema.ts     ← Zod/Fastify validation schema
│   ├── astrologer/
│   ├── service/
│   ├── slot/
│   ├── booking/
│   ├── session/
│   ├── post/
│   └── review/
├── jobs/
│   ├── session-start.job.ts
│   └── session-end.job.ts
├── webhooks/
│   └── razorpay.webhook.ts
├── shared/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── role.middleware.ts
│   ├── errors/
│   │   └── app-error.ts
│   ├── utils/
│   └── types/
├── config/
│   └── env.ts
├── app.ts                 ← Fastify instance, register plugins + routes
└── server.ts              ← Entry point, listen
```

### Backend Conventions

- **3-layer architecture per module:** `routes → controller → service`
- Controllers never touch DB directly — always call service
- Services contain all business logic and Drizzle queries
- `auth.schema.ts` = Zod schemas for request validation (not DB schema)
- All routes use `fastify-plugin` for encapsulation
- Error responses: `{ success: false, message: string, code?: string }`
- Success responses: `{ success: true, data: any }`
- All IDs are UUIDs
- Timestamps use `defaultNow()` in Drizzle
- Enums defined in `db/schema/` and reused across modules

---

## Frontend Structure — `astrobook-mobile/src/`

```
src/
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   ├── feed/              ← Home feed — astrologer posts
│   ├── explore/           ← Browse astrologers
│   ├── astrologer/        ← Astrologer profile + services
│   ├── booking/           ← Service detail, slot selection, cart, checkout
│   ├── session/           ← Video/voice call + RTM chat
│   ├── my-bookings/       ← Upcoming / Completed / Cancelled
│   ├── review/            ← Rating + review after session
│   └── posts/             ← Create/manage posts (astrologer only)
├── shared/
│   ├── components/        ← Reusable UI components
│   ├── hooks/             ← Shared hooks
│   ├── utils/             ← Helpers, formatters, date utils
│   ├── types/             ← Global TypeScript types
│   └── api/               ← Axios instance + interceptors
├── navigation/
│   ├── UserNavigator.tsx
│   ├── AstrologerNavigator.tsx
│   └── RootNavigator.tsx
└── store/
    ├── auth.store.ts      ← Zustand — auth state, JWT
    └── cart.store.ts      ← Zustand — cart items (persisted to AsyncStorage)
```

### Frontend Conventions

- Feature-based — each feature is self-contained
- Screens go in `features/<name>/screens/`
- Reusable components only in `shared/components/`
- API calls go in `features/<name>/api/` — no direct axios calls in screens
- Use React Query for all server state — no manual loading states
- Use Zustand for global client state (auth, cart)
- Cart is stored locally in AsyncStorage — no backend cart table
- Navigation is role-based — `RootNavigator` checks role from auth store

---

## Database Schema Summary

All schemas defined in `apps/server/src/db/schema/` — central location.

| Table | Key Fields |
|---|---|
| `users` | id, name, email, phone, role, google_id |
| `astrologer_profiles` | user_id, bio, experience_years, languages[], specializations[], rating, photo_url |
| `services` | astrologer_id, name, duration_mins, price, call_type (VIDEO/VOICE), is_active |
| `availability` | astrologer_id, day_of_week (0-6), start_time, end_time |
| `bookings` | user_id, service_id, astrologer_id, scheduled_at, status, payment_status |
| `payments` | booking_id, razorpay_order_id, razorpay_payment_id, amount, status |
| `sessions` | booking_id, agora_channel, started_at, ended_at, status |
| `messages` | session_id, sender_id, content, file_url, sent_at |
| `posts` | astrologer_id, content, media_url, media_type (IMAGE/VIDEO) |
| `reviews` | booking_id, user_id, astrologer_id, rating (1-5), comment |

---

## API Routes Summary

### Auth
```
POST /auth/send-otp
POST /auth/verify-otp
POST /auth/google
POST /auth/refresh
POST /auth/logout
```

### Users
```
GET  /users/me
PATCH /users/me
```

### Astrologers
```
GET  /astrologers
GET  /astrologers/:id
PATCH /astrologers/profile
POST /astrologers/availability
GET  /astrologers/:id/availability
```

### Services
```
GET  /services/astrologer/:id
POST /services
PATCH /services/:id
DELETE /services/:id
```

### Slots
```
GET  /slots/:astrologerId/:serviceId?date=YYYY-MM-DD
POST /slots/check
```

### Bookings
```
POST /bookings
POST /bookings/webhook
GET  /bookings/my
GET  /bookings/:id
```

### Sessions
```
POST /sessions/:bookingId/join
POST /sessions/:id/end
GET  /sessions/:id/messages
POST /sessions/:id/messages
```

### Posts
```
GET  /posts
GET  /posts/astrologer/:id
POST /posts
DELETE /posts/:id
```

### Reviews
```
POST /reviews
GET  /reviews/astrologer/:id
```

---

## Key Business Logic

### Slot System
- Slots are generated dynamically — no Slot table in DB
- Algorithm: fetch availability for day → generate slots (window / duration) → remove slots overlapping existing confirmed bookings → return available slots
- Slots are NOT reserved when added to cart
- Slot is only blocked after payment webhook confirms booking

### Cart + Checkout
- Cart lives in AsyncStorage (Zustand + AsyncStorage persistence)
- Each cart item = { serviceId, astrologerId, scheduledAt, price, serviceName, astrologerName }
- At checkout: POST /slots/check first → if any slot taken → show error → user must reselect
- All slots available → POST /bookings → creates Razorpay order → open Razorpay checkout
- Booking only confirmed after Razorpay webhook fires

### Payment Flow
- Never confirm booking from frontend callback — only from webhook
- Webhook endpoint: POST /bookings/webhook
- Verify Razorpay signature before processing
- On success: create all bookings, schedule BullMQ jobs

### Session Flow
- BullMQ job fires at scheduled_at → push notification to both parties
- Join: POST /sessions/:bookingId/join → backend generates Agora RTC + RTM tokens
- Agora channel name format: `session_{booking_id}`
- BullMQ end-job fires at scheduled_at + duration_mins → revoke tokens → session ENDED
- No session extension in MVP

### In-Session Chat
- Agora RTM for real-time messaging
- Files/images/documents → upload to Cloudinary first → send Cloudinary URL via RTM
- Messages also saved to DB (messages table) for history

### Posts
- Only ASTROLOGER role can create posts
- Users can only view — no likes/comments/share in MVP
- Media (image/video) uploaded to Cloudinary before post creation

---

## Auth

- JWT access token: 15 min expiry
- JWT refresh token: 30 days, stored in AsyncStorage
- JWT payload: `{ userId, role, iat, exp }`
- Silent refresh on 401 response via Axios interceptor
- Google OAuth: frontend gets Google token → POST /auth/google → backend verifies with Google → returns JWT
- Account linking: same email via phone + Google = same account

---

## What NOT to Do

- Do NOT add admin dashboard — out of scope
- Do NOT add courses or products — out of scope for MVP
- Do NOT add post likes/comments/share — out of scope
- Do NOT reserve/hold slots in cart — real-time check at checkout only
- Do NOT confirm bookings from frontend payment callback — webhook only
- Do NOT put schema files inside module folders — always in `db/schema/`
- Do NOT call DB directly from controllers — always go through service layer
- Do NOT add automatic refund logic — manual only for MVP

---

## Environment Variables

### Backend (`astrobook-server/.env`)
```
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
GOOGLE_CLIENT_ID=
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
REDIS_URL=
```

### Frontend (`astrobook-mobile/.env`)
```
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_AGORA_APP_ID=
EXPO_PUBLIC_RAZORPAY_KEY_ID=
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
```

---

*Astrobook MVP v2.0 — Inevelop Ventures — June 2026*
