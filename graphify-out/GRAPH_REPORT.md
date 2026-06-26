# Graph Report - .  (2026-06-27)

## Corpus Check
- Corpus is ~19,800 words - fits in a single context window. You may not need a graph.

## Summary
- 130 nodes · 55 edges · 94 communities (6 shown, 88 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Booking & Payment Data|Booking & Payment Data]]
- [[_COMMUNITY_Core Tech Stack|Core Tech Stack]]
- [[_COMMUNITY_Authentication System|Authentication System]]
- [[_COMMUNITY_Real-time Session Flow|Real-time Session Flow]]
- [[_COMMUNITY_Consultation & Slot Booking|Consultation & Slot Booking]]
- [[_COMMUNITY_In-session Chat & Media|In-session Chat & Media]]
- [[_COMMUNITY_Build Phases|Build Phases]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]
- [[_COMMUNITY_Isolated Module|Isolated Module]]

## God Nodes (most connected - your core abstractions)
1. `users Table` - 8 edges
2. `bookings Table` - 8 edges
3. `BullMQ + Redis Job Scheduling` - 5 edges
4. `Session Flow (Agora + BullMQ + Push Notification)` - 5 edges
5. `Razorpay Webhook Handler (POST /bookings/webhook)` - 5 edges
6. `Astrobook App` - 4 edges
7. `Webhook-only Booking Confirmation` - 4 edges
8. `Fastify (TypeScript) Backend` - 3 edges
9. `Custom JWT Authentication` - 3 edges
10. `Dynamic Slot Generation (no Slot table in DB)` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Supabase PostgreSQL (Legacy, Replaced by Railway)` --semantically_similar_to--> `PostgreSQL on Railway`  [INFERRED] [semantically similar]
  README.md → AGENTS.md
- `Firebase Auth (Legacy Architecture, Replaced)` --semantically_similar_to--> `Custom JWT Authentication`  [INFERRED] [semantically similar]
  README.md → AGENTS.md
- `JWT + DB Sessions (Max 3 Concurrent Devices)` --semantically_similar_to--> `auth_sessions Table (Refresh Token Store)`  [INFERRED] [semantically similar]
  README.md → BACKEND.md
- `auth_sessions Table (Refresh Token Store)` --references--> `users Table`  [EXTRACTED]
  BACKEND.md → AGENTS.md
- `Razorpay Webhook Handler (POST /bookings/webhook)` --references--> `Razorpay Payments`  [EXTRACTED]
  BACKEND.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Unified Authentication System (Phone OTP + Google + JWT)** — astrobook_backend_agents_jwt_auth, astrobook_backend_agents_msg91, astrobook_backend_agents_google_oauth, astrobook_backend_backend_auth_sessions_table [EXTRACTED 1.00]
- **Session Execution Flow (Real-time A/V + Chat + Scheduling + Notifications)** — astrobook_backend_agents_agora_rtc, astrobook_backend_agents_agora_rtm, astrobook_backend_agents_bullmq, astrobook_backend_agents_expo_push, astrobook_backend_backend_session_start_job, astrobook_backend_backend_session_end_job [EXTRACTED 1.00]
- **Payment and Booking Confirmation Pipeline** — astrobook_backend_agents_razorpay, astrobook_backend_agents_bookings_table, astrobook_backend_agents_payments_table, astrobook_backend_backend_razorpay_webhook_handler [EXTRACTED 1.00]

## Communities (94 total, 88 thin omitted)

### Community 0 - "Booking & Payment Data"
Cohesion: 0.31
Nodes (10): astrologer_profiles Table, bookings Table, Webhook-only Booking Confirmation, payments Table, posts Table, Razorpay Payments, reviews Table, services Table (+2 more)

### Community 1 - "Core Tech Stack"
Cohesion: 0.25
Nodes (8): ASTROLOGER Role, Drizzle ORM, Fastify (TypeScript) Backend, PostgreSQL on Railway, Astrobook App, 3-Layer Module Architecture (routes→controller→service), USER Role, Supabase PostgreSQL (Legacy, Replaced by Railway)

### Community 2 - "Authentication System"
Cohesion: 0.29
Nodes (7): Google OAuth, Custom JWT Authentication, MSG91 OTP Service, auth_sessions Table (Refresh Token Store), Fastify + Firebase Admin SDK Architecture (Legacy README), Firebase Auth (Legacy Architecture, Replaced), JWT + DB Sessions (Max 3 Concurrent Devices)

### Community 3 - "Real-time Session Flow"
Cohesion: 0.60
Nodes (6): Agora RTC (Video/Voice Calls), BullMQ + Redis Job Scheduling, Expo Push Notifications, Session Flow (Agora + BullMQ + Push Notification), session-end BullMQ Job, session-start BullMQ Job

### Community 4 - "Consultation & Slot Booking"
Cohesion: 0.40
Nodes (6): availability Table, Cart in AsyncStorage/Zustand (no backend cart table), React Native + Expo Frontend, Dynamic Slot Generation (no Slot table in DB), Consultancy Flow (5-Screen UI: Service→Slot→Cart→Checkout→Confirmation), Slot Generation Algorithm Detail

### Community 5 - "In-session Chat & Media"
Cohesion: 0.40
Nodes (5): Agora RTM (In-session Chat), agora_sessions (sessions) Table, Cloudinary File Storage, In-session Chat (Agora RTM + Cloudinary + DB), messages Table

## Knowledge Gaps
- **95 isolated node(s):** `buildApp`, `Env`, `getPool`, `getDb`, `closeDb` (+90 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **88 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `users Table` connect `Booking & Payment Data` to `Authentication System`, `Consultation & Slot Booking`, `In-session Chat & Media`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `bookings Table` connect `Booking & Payment Data` to `Consultation & Slot Booking`, `In-session Chat & Media`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `auth_sessions Table (Refresh Token Store)` connect `Authentication System` to `Booking & Payment Data`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `buildApp`, `Env`, `getPool` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._