# BACKEND.md — Astrobook Server

> Shambo ke liye backend development guide.
> Pehle wala codebase (`astrobook-backend.zip`) reference ke liye use karo — foundation ready hai.
> Frontend ka latest code `app.zip` mein hai — usi ke hisaab se API banana hai.

---

## Project Info

| | |
|---|---|
| **Framework** | Fastify (TypeScript) |
| **ORM** | Drizzle ORM |
| **Database** | PostgreSQL (Railway) |
| **Auth** | Custom JWT + MSG91 OTP + Google OAuth |
| **Video/Voice** | Agora RTC + RTM |
| **Payments** | Razorpay |
| **Jobs** | BullMQ + Redis |
| **File Storage** | Cloudinary |

---

## Frontend Screens Jo Ban Gaye Hain

Frontend mein yeh screens ready hain — inke liye API chahiye:

**Auth:**
- `(auth)/login.tsx` — Phone number + Google login
- `(auth)/otp.tsx` — OTP verify
- `(auth)/onboarding.tsx` — Name, email, DOB, interests

**User Panel:**
- `(user)/feed.tsx` — Posts feed
- `(user)/explore/index.tsx` — Categories grid with filters
- `(user)/explore/[category].tsx` — Category detail (posts + astrologers)
- `(user)/astrologers.tsx` — Astrologers list
- `(user)/astrologer-profile.tsx` — Astrologer detail + services + posts
- `(user)/service/[id].tsx` — Service detail page
- `(user)/book-slot.tsx` — Slot selection
- `(user)/cart.tsx` — Cart
- `(user)/checkout.tsx` — Checkout
- `(user)/booking-confirmation.tsx` — Booking confirmed
- `(user)/my-bookings.tsx` — My bookings (upcoming/completed/cancelled)
- `(user)/post/[id].tsx` — Post detail
- `(user)/profile.tsx` — User profile

**Astrologer Panel:**
- `(astrologer)/dashboard.tsx` — Dashboard
- `(astrologer)/services.tsx` — Manage services
- `(astrologer)/availability.tsx` — Weekly schedule
- `(astrologer)/posts.tsx` — Create/manage posts

---

## Folder Structure

```
src/
├── config/
│   └── env.ts
├── core/
│   ├── database/
│   │   ├── client.ts
│   │   └── schema/
│   │       ├── index.ts
│   │       ├── users.ts
│   │       ├── astrologer-profiles.ts
│   │       ├── services.ts
│   │       ├── availability.ts
│   │       ├── bookings.ts
│   │       ├── payments.ts
│   │       ├── agora-sessions.ts
│   │       ├── auth-sessions.ts
│   │       ├── messages.ts
│   │       ├── posts.ts
│   │       └── reviews.ts
│   ├── errors/
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── errorHandler.ts
│   │   └── requestLogger.ts
│   ├── plugins/
│   └── utils/
│       ├── msg91.ts
│       ├── google-oauth.ts
│       ├── agora.ts
│       └── cloudinary.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── astrologers/
│   ├── services/
│   ├── slots/
│   ├── bookings/
│   ├── sessions/
│   ├── posts/
│   └── reviews/
├── jobs/
│   ├── session-start.job.ts
│   └── session-end.job.ts
├── webhooks/
│   └── razorpay.webhook.ts
├── app.ts
└── server.ts
```

---

## DB Schema

### users
```ts
id: uuid PK
name: varchar(255)
email: varchar(255) unique nullable
phone: varchar(20) unique nullable
role: enum('USER', 'ASTROLOGER') default 'USER'
google_id: varchar nullable
is_onboarded: boolean default false
interests: text[] nullable          // ['Numerology', 'Tarot', ...]
date_of_birth: date nullable
created_at: timestamp
updated_at: timestamp
```

### astrologer_profiles
```ts
id: uuid PK
user_id: uuid FK → users (unique)
bio: text
experience_years: integer
languages: text[]                   // ['Bengali', 'Hindi', 'English']
specializations: text[]             // ['Kundli', 'Astrology']
rating: decimal default 0
photo_url: text nullable
is_online: boolean default false
```

### services
```ts
id: uuid PK
astrologer_id: uuid FK → users
name: varchar(255)
description: text
duration_mins: integer
price: decimal
call_type: enum('VIDEO', 'VOICE')
is_active: boolean default true
created_at: timestamp
```

### availability
```ts
id: uuid PK
astrologer_id: uuid FK → users
day_of_week: integer  (0=Sun ... 6=Sat)
start_time: time
end_time: time
```

### bookings
```ts
id: uuid PK
user_id: uuid FK → users
service_id: uuid FK → services
astrologer_id: uuid FK → users      // denormalized
scheduled_at: timestamp
status: enum('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')
payment_status: enum('PENDING', 'PAID', 'REFUNDED')
created_at: timestamp
```

### payments
```ts
id: uuid PK
booking_id: uuid FK → bookings (unique)
razorpay_order_id: varchar
razorpay_payment_id: varchar nullable
amount: decimal
status: enum('PENDING', 'PAID', 'FAILED', 'REFUNDED')
created_at: timestamp
```

### agora_sessions
```ts
id: uuid PK
booking_id: uuid FK → bookings (unique)
agora_channel: varchar              // format: session_{booking_id}
rtc_token_user: text nullable
rtc_token_astro: text nullable
started_at: timestamp nullable
ended_at: timestamp nullable
status: enum('WAITING', 'ACTIVE', 'ENDED')
```

### messages
```ts
id: uuid PK
session_id: uuid FK → agora_sessions
sender_id: uuid FK → users
content: text nullable
file_url: text nullable             // Cloudinary URL
sent_at: timestamp
```

### posts
```ts
id: uuid PK
astrologer_id: uuid FK → users
content: text
media_url: text nullable
media_type: enum('IMAGE', 'VIDEO') nullable
created_at: timestamp
```

### reviews
```ts
id: uuid PK
booking_id: uuid FK → bookings (unique)
user_id: uuid FK → users
astrologer_id: uuid FK → users
rating: integer  (1-5)
comment: text nullable
created_at: timestamp
```

### auth_sessions
```ts
id: uuid PK
user_id: uuid FK → users
refresh_token: text unique
device_info: jsonb nullable
expires_at: timestamp
created_at: timestamp
```

---

## API Routes

### Auth
```
POST /auth/send-otp
  Body: { phone: "+91XXXXXXXXXX" }
  → MSG91 se OTP bhejo, Redis mein store karo (5 min)

POST /auth/verify-otp
  Body: { phone, otp }
  → Verify → JWT return
  Response: { accessToken, refreshToken, user, isNewUser }

POST /auth/google
  Body: { idToken: "google_token" }
  → Verify with Google → JWT return
  Response: { accessToken, refreshToken, user, isNewUser }

POST /auth/refresh
  Body: { refreshToken }
  → New access token

POST /auth/logout
  Body: { refreshToken }
```

### Users
```
GET  /users/me
PATCH /users/me
  Body: { name?, email?, photoUrl? }

POST /users/onboard
  Body: { name, email?, dateOfBirth?, interests[] }
```

### Astrologers
```
GET  /astrologers
  Query: { search?, specialization?, page?, limit? }
  Response: { astrologers[], total }

GET  /astrologers/:id
  Response: { astrologer, services[], recentPosts[] }

PATCH /astrologers/profile       (astrologer auth)
  Body: { bio?, languages?, specializations?, photoUrl? }

POST /astrologers/availability    (astrologer auth)
  Body: { availability: [{ dayOfWeek, startTime, endTime }] }

GET  /astrologers/:id/availability
```

### Services
```
GET  /services/astrologer/:id
  Response: { services[] }

POST /services                    (astrologer auth)
  Body: { name, description, durationMins, price, callType }

PATCH /services/:id               (astrologer auth)
DELETE /services/:id              (astrologer auth — soft delete)
```

### Slots
```
GET  /slots/:astrologerId/:serviceId?date=YYYY-MM-DD
  Response: { slots: [{ time, available }] }

POST /slots/check
  Body: { items: [{ serviceId, astrologerId, scheduledAt }] }
  Response: { allAvailable: boolean, unavailable: [] }
```

### Bookings
```
POST /bookings
  Body: { items: [{ serviceId, astrologerId, scheduledAt }] }
  Response: { razorpayOrderId, amount, bookingIds[] }

POST /bookings/webhook
  → Razorpay webhook (payment.captured)
  → Verify signature → confirm bookings → schedule BullMQ jobs

GET  /bookings/my
  Query: { status?, page? }

GET  /bookings/:id
```

### Sessions
```
POST /sessions/:bookingId/join
  Response: { agoraChannel, rtcToken, rtmToken }

POST /sessions/:id/end
  → Called by BullMQ job

GET  /sessions/:id/messages
POST /sessions/:id/messages
  Body: { content?, fileUrl? }
```

### Posts
```
GET  /posts
  Query: { page?, limit?, astrologerId? }
  Response: { posts[], total }

GET  /posts/astrologer/:id

POST /posts                       (astrologer auth)
  Body: { content, mediaUrl?, mediaType? }

DELETE /posts/:id                 (astrologer auth)
```

### Reviews
```
POST /reviews
  Body: { bookingId, rating, comment? }

GET  /reviews/astrologer/:id
  Response: { reviews[], avgRating, total }
```

---

## Auth Flow Detail

### Phone OTP
```
1. POST /auth/send-otp { phone }
   → Generate 4-digit OTP
   → Store in Redis: key="otp:{phone}", value=otp, TTL=300s
   → Send via MSG91

2. POST /auth/verify-otp { phone, otp }
   → Redis se OTP fetch karo
   → Match karo
   → User dhundho ya banao
   → isNewUser flag return karo
   → JWT issue karo
```

### Google OAuth
```
1. Frontend Google se idToken lata hai
2. POST /auth/google { idToken }
3. Backend: googleapis se verify karo
4. Email extract karo
5. User dhundho (email se) ya banao
6. JWT issue karo
```

### Response Format (standard)
```json
// Success
{ "success": true, "data": {} }

// Error
{ "success": false, "message": "Error message", "code": "ERROR_CODE" }
```

---

## Slot Generation Logic

```
GET /slots/:astrologerId/:serviceId?date=2026-06-25

1. Astrologer ka availability fetch karo (day_of_week se match karo)
2. Slots generate karo:
   window = endTime - startTime (minutes)
   slots = window / service.durationMins
   e.g. 11:00-16:00 with 60min service = [11:00, 12:00, 13:00, 14:00, 15:00]

3. Us date ke CONFIRMED bookings fetch karo (same astrologer)
4. Har booking ke scheduled_at se end time calculate karo
5. Generated slots mein se overlapping wale remove karo
6. Return remaining available slots
```

---

## Payment Flow

```
1. POST /bookings → Razorpay order create karo → return orderId
2. Frontend Razorpay checkout open karta hai
3. Payment complete → Razorpay fires webhook
4. POST /bookings/webhook
   → Razorpay signature verify karo
   → Bookings CONFIRMED mark karo
   → BullMQ jobs schedule karo (session start + end)
5. Frontend polls /bookings/my ya socket event wait karta hai
```

---

## BullMQ Jobs

```
session-start job:
  Fires at: booking.scheduled_at
  Action: Push notification dono ko, session status = WAITING

session-end job:
  Fires at: booking.scheduled_at + service.duration_mins
  Action: Agora tokens revoke, session ENDED, booking COMPLETED
```

---

## Pehle Wale Backend Se Reuse Karo

`astrobook-backend.zip` se yeh directly reuse kar sakte ho:

| File | Status |
|---|---|
| `src/core/database/client.ts` | ✅ Reuse |
| `src/core/errors/` | ✅ Reuse |
| `src/core/middleware/errorHandler.ts` | ✅ Reuse |
| `src/modules/consultation/services/agora.service.ts` | ✅ Reuse |
| `src/modules/payment/` | ✅ Reuse (modify webhook) |
| `drizzle.config.ts` | ✅ Reuse |
| `src/modules/auth/` | ❌ Scratch se — Firebase hata ke custom JWT |

---

## Environment Variables

```env
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@railway-host:5432/astrobook

# JWT
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=30d

# MSG91
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Agora
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Redis
REDIS_URL=redis://localhost:6379
```

---

## Build Order

| Phase | Kya Karna Hai |
|---|---|
| Phase 1 | Railway PostgreSQL + Drizzle schema + migrations |
| Phase 2 | Auth — MSG91 OTP + Google OAuth + JWT |
| Phase 3 | Users CRUD + Onboarding |
| Phase 4 | Astrologer profile + Services CRUD |
| Phase 5 | Availability setup + Slot generation API |
| Phase 6 | Bookings + Razorpay order + Webhook |
| Phase 7 | BullMQ + Redis |
| Phase 8 | Agora session — join + end + messages |
| Phase 9 | Posts CRUD |
| Phase 10 | Reviews |
| Phase 11 | Push notifications |
| Phase 12 | Testing + Deploy |

---

*Astrobook MVP v2.0 — Inevelop Ventures — June 2026*

---

## Consultancy Flow — Frontend Se Exactly Match Karo

Yeh frontend screens ke exact flow ke hisaab se backend banana hai.

---

### Screen 1: Service Detail (`/service/[id]`)

**API needed:**
```
GET /services/:id
Response: {
  id, name, description, durationMins, price, callType,
  astrologer: { id, name, emoji, speciality, experience, bio },
  reviews: [{ name, rating, comment, date }],
  avgRating, totalReviews
}
```

**Buttons:**
- **Add to Cart** → sirf local state mein add hoga (Zustand) — NO API call
- **Book Now** → book-slot screen pe jaata hai

---

### Screen 2: Book Slot (`/book-slot`)

**Params received:** `astroId`, `serviceId`

**API needed:**
```
GET /slots/:astrologerId/:serviceId?date=YYYY-MM-DD
Response: {
  slots: [
    { time: "11:00 AM", available: true },
    { time: "12:00 PM", available: false },
    ...
  ]
}
```

**Logic:**
1. Next 7 days dikhata hai
2. User date select karta hai → fresh slot API call
3. User slot select karta hai → "Add to Cart →" button active hota hai
4. Add to Cart press → `{ serviceId, astrologerId, scheduledAt }` local cart mein add hota hai

**Important:** Slot ko RESERVE nahi karna is point pe — cart mein sirf save hoga.

---

### Screen 3: Cart (`/cart`)

Cart **Zustand store** mein hoga (frontend local state) — koi cart API nahi chahiye.

**Cart item structure:**
```ts
{
  id: string           // serviceId
  serviceName: string
  astrologerName: string
  astrologerId: string
  price: number
  emoji: string
  color: string
  scheduledAt: string  // ISO datetime — book-slot se aayega
  slotConfirmed: boolean
}
```

**Cart mein:**
- Items list dikhata hai
- Price breakdown: originalPrice - discount + platformFee + shipping
- Har item ke liye "Confirm Slot" button hoga
- **"Make Payment"** button tabhi active hoga jab saare slots confirm hon

**"Confirm Slot" press karne pe:**
```
POST /slots/check
Body: { items: [{ serviceId, astrologerId, scheduledAt }] }
Response: { allAvailable: true/false, unavailable: [{ serviceId, reason }] }
```

Agar available → `slotConfirmed = true`
Agar nahi → user ko batao slot gone, naya select karo

---

### Screen 4: Checkout (`/checkout`)

**APIs needed:**

```
GET /users/me
Response: { name, phone, email }
(Customer details section ke liye)

POST /bookings
Body: {
  items: [
    {
      serviceId: string,
      astrologerId: string,
      scheduledAt: string  // ISO datetime
    }
  ]
}
Response: {
  razorpayOrderId: string,
  amount: number,          // paise mein (multiply by 100)
  currency: "INR",
  bookingIds: string[]
}
```

**Coupon validation:**
```
POST /coupons/validate
Body: { code: string, amount: number }
Response: { valid: boolean, discount: number, message? }
```

**Frontend Razorpay flow:**
```
1. POST /bookings → razorpayOrderId milta hai
2. Frontend Razorpay SDK open karta hai
3. User payment karta hai
4. Razorpay webhook fire hota hai → POST /bookings/webhook
5. Backend signature verify karta hai → bookings CONFIRMED
6. Frontend → booking-confirmation screen
```

---

### Screen 5: Booking Confirmation (`/booking-confirmation`)

**API needed:**
```
GET /bookings/:id
Response: {
  bookingId,
  transactionId,
  orderDate,
  items: [
    {
      serviceName,
      astrologerName,
      type: "Consultation",
      price,
      date,
      emoji
    }
  ],
  customer: { name, phone, email },
  priceBreakdown: { original, discount, platformFee, shipping, total }
}
```

---

### Screen 6: My Bookings (`/my-bookings`)

**API needed:**
```
GET /bookings/my?status=UPCOMING
GET /bookings/my?status=COMPLETED
GET /bookings/my?status=CANCELLED

Response: {
  bookings: [
    {
      id,
      serviceName,
      astrologerName,
      emoji,
      date,
      time,
      durationMins,
      callType,
      price,
      status
    }
  ]
}
```

**"Join Session" button:**
```
POST /sessions/:bookingId/join
Response: {
  agoraChannel: string,
  rtcToken: string,
  rtmToken: string
}
```

---

## Slot Confirmation vs Booking — Difference

| Action | When | What Happens |
|---|---|---|
| Add to Cart | Service/Book-slot screen | Local state mein save, NO API |
| Confirm Slot | Cart screen | `POST /slots/check` — availability verify only |
| Make Payment | Checkout screen | `POST /bookings` → Razorpay order create |
| Payment Done | Razorpay webhook | Slot actually booked, booking CONFIRMED |

**Slot reservation nahi hogi** — sirf checkout pe real-time check hoga.

---

## Razorpay Webhook Handler

```ts
POST /bookings/webhook

1. Headers se `x-razorpay-signature` verify karo
   const expectedSig = hmac_sha256(razorpay_order_id + "|" + razorpay_payment_id, WEBHOOK_SECRET)
   if expectedSig !== signature → 400 reject

2. event === "payment.captured" toh:
   - bookings update karo: status = CONFIRMED, payment_status = PAID
   - payment record update karo
   - BullMQ jobs schedule karo:
     - session-start job at booking.scheduled_at
     - session-end job at booking.scheduled_at + service.duration_mins

3. Return 200 OK
```

---

## Cart Item — API Response Format Jo Frontend Expect Karta Hai

Frontend mock data se match karo:

```ts
// Astrologer card
{
  id: "astro_001",
  name: "Suprio Karmakar",
  emoji: "🔮",
  speciality: "Vedic Astrology",
  languages: "Bengali, Hindi, English",
  experience: "12 years",        // string format
  rating: 4.8,
  reviews: 342,
  price: 499,                    // minimum service price
  online: true,
  bio: "Expert in Vedic Astrology...",
  interests: ["Kundli", "Astrology"],
  color: "#6B21A8"               // frontend ke liye color (hardcode karo pehle)
}

// Service card
{
  id: "svc_001",
  astrologerId: "astro_001",
  name: "Birth Chart Analysis",
  description: "Detailed analysis...",
  durationMins: 60,
  price: 499,
  callType: "VIDEO"
}

// Post card
{
  id: "post_001",
  astrologerId: "astro_001",
  astrologerName: "Suprio Karmakar",
  emoji: "🙏",
  bgColor: "#6B21A8",           // frontend ke liye color
  content: "Post content...",
  footer: "Footer text",
  likes: 248,
  comments: 42,
  shares: 18,
  createdAt: "2025-11-01T10:00:00Z"
}

// Slot
{
  time: "11:00 AM",
  available: true
}

// Booking
{
  id: "booking_001",
  serviceName: "Birth Chart Analysis",
  astrologerName: "Suprio Karmakar",
  emoji: "🔮",
  date: "21 Jun 2026",
  time: "2:28 pm",
  durationMins: 60,
  callType: "VIDEO",
  price: 499,
  status: "UPCOMING"            // UPCOMING | COMPLETED | CANCELLED
}
```

