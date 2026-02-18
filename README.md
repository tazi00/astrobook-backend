# 🔐 Astrobook Backend - Firebase Auth + JWT Sessions

Production-ready authentication system with Firebase identity management and JWT-based sessions.

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                  │
│  (React Native / Next.js)                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    1. Firebase Auth
                    (Phone/Email/Google)
                             │
                    2. Get idToken
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FASTIFY BACKEND                              │
│                                                                   │
│  POST /auth/login { idToken }                                    │
│    │                                                              │
│    ├─► Verify Firebase token (Admin SDK)                        │
│    ├─► Extract: uid, email, phone, name                         │
│    ├─► Find or create user in Supabase                          │
│    ├─► Issue JWT (access + refresh)                             │
│    ├─► Store refresh token in sessions table                    │
│    └─► Enforce max 3 sessions per user                          │
│                                                                   │
│  Protected Routes: Authorization: Bearer <accessToken>           │
│                                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │   SUPABASE     │
                   │   PostgreSQL   │
                   │                │
                   │  ├─ users      │
                   │  └─ sessions   │
                   └────────────────┘
```

---

## 🔥 Key Features

✅ **Firebase Authentication** - Phone OTP, Email, Google OAuth  
✅ **JWT Sessions** - Stateless access tokens + DB-stored refresh tokens  
✅ **Device Limits** - Max 3 concurrent sessions per user  
✅ **Role-Based Access** - `user`, `astrologer`, `admin`  
✅ **Onboarding Flow** - `isOnboarded` flag for first-time setup  
✅ **Token Refresh** - Automatic access token rotation  
✅ **Logout / Logout All** - Single device or all devices  
✅ **Production-Ready** - Error handling, logging, rate limiting, Swagger docs

---

## 📦 Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify 4
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL (Supabase)
- **ORM:** Drizzle ORM
- **Auth:** Firebase Admin SDK + @fastify/jwt
- **Validation:** Zod
- **API Docs:** Swagger/OpenAPI

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env`:
- Add your `DATABASE_URL` (Supabase connection string)
- Put your Firebase service account JSON in the project root
- Set `FIREBASE_SERVICE_ACCOUNT_PATH` to the filename
- Generate secure JWT secrets (32+ chars):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. Generate and Run Migrations

```bash
npm run db:generate  # Generate migration from schema
npm run db:migrate   # Apply migration to database
```

### 4. Start Server

```bash
npm run dev
```

Server: `http://localhost:3000`  
Swagger: `http://localhost:3000/docs`

---

## 📁 Project Structure

```
src/
├── config/
│   └── env.ts                  # Zod-validated environment config
│
├── core/
│   ├── database/
│   │   ├── client.ts           # Drizzle + pg pool
│   │   └── schema/
│   │       ├── users.ts        # Users table with Firebase UID
│   │       ├── sessions.ts     # Refresh token storage
│   │       └── index.ts
│   ├── errors/
│   │   └── AppError.ts         # Typed error classes
│   ├── middleware/
│   │   ├── errorHandler.ts    # Global error handler
│   │   └── requestLogger.ts   # Request/response logging
│   ├── plugins/
│   │   ├── index.ts            # Register all plugins (JWT, CORS, etc.)
│   │   └── swagger.ts          # OpenAPI docs
│   └── utils/
│       └── firebase.ts         # Firebase Admin SDK singleton
│
├── modules/
│   └── auth/
│       ├── controllers/        # HTTP handlers
│       ├── services/           # Business logic
│       ├── repositories/       # Database queries
│       ├── schemas/            # Zod validation schemas
│       ├── middleware/         # Auth middleware (JWT verify)
│       └── routes/             # Route registration
│
├── app.ts                      # Fastify app factory
└── server.ts                   # Entry point
```

---

## 🔐 Authentication Flow

### Login with Firebase

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "idToken": "<firebase-id-token>",
  "deviceInfo": {
    "userAgent": "...",
    "platform": "ios"
  }
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "firebaseUid": "...",
    "email": "user@example.com",
    "phone": "+1234567890",
    "name": "John Doe",
    "role": "user",
    "isOnboarded": false
  }
}
```

### Protected Routes

```http
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh-token>"
}
```

Or use httpOnly cookie (automatic).

### Logout

```http
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "<refresh-token>"
}
```

### Logout All Devices

```http
POST /api/v1/auth/logout-all
Authorization: Bearer <accessToken>
```

---

## 🛡️ Security Features

### JWT Strategy
- **Access Token:** 30 minutes, contains `userId`, `role`, `isOnboarded`
- **Refresh Token:** 30 days, stored in database with device info
- **Token Rotation:** New refresh token on every refresh (optional, implement if needed)

### Session Management
- Max 3 active sessions per user
- Oldest session deleted when 4th login occurs
- Device info tracked: `userAgent`, `ip`, `platform`

### Role-Based Access Control

```typescript
// Protect route with role check
app.get('/admin/dashboard', {
  preHandler: [authenticate, requireRole(['admin'])],
}, handler)

// Require onboarding
app.get('/profile', {
  preHandler: [authenticate, requireOnboarded],
}, handler)
```

---

## 📊 Database Schema

### `users` Table

| Column        | Type      | Description                   |
|---------------|-----------|-------------------------------|
| id            | UUID      | Primary key                   |
| firebaseUid   | VARCHAR   | Unique Firebase user ID       |
| email         | VARCHAR   | User email (nullable)         |
| phone         | VARCHAR   | User phone (nullable)         |
| name          | VARCHAR   | Display name                  |
| role          | ENUM      | user / astrologer / admin     |
| isOnboarded   | BOOLEAN   | Onboarding completion status  |
| createdAt     | TIMESTAMP | Account creation time         |
| updatedAt     | TIMESTAMP | Last update time              |

### `sessions` Table

| Column        | Type      | Description                   |
|---------------|-----------|-------------------------------|
| id            | UUID      | Primary key                   |
| userId        | UUID      | Foreign key → users           |
| refreshToken  | TEXT      | Unique refresh token          |
| deviceInfo    | JSONB     | userAgent, ip, platform       |
| expiresAt     | TIMESTAMP | Token expiration              |
| createdAt     | TIMESTAMP | Session creation time         |

---

## 🧪 Testing

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## 🚢 Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (64+ chars)
- [ ] Enable HTTPS
- [ ] Set `secure: true` for cookies
- [ ] Configure CORS for your frontend domain
- [ ] Set up proper logging (e.g., Datadog, Sentry)
- [ ] Enable rate limiting per IP
- [ ] Run migrations on prod DB
- [ ] Add Firebase service account JSON securely (env or secrets manager)

---

## 📚 API Endpoints

| Method | Path                  | Auth Required | Description              |
|--------|-----------------------|---------------|--------------------------|
| GET    | /health               | No            | Health check             |
| POST   | /api/v1/auth/login    | No            | Login with Firebase      |
| POST   | /api/v1/auth/refresh  | No            | Refresh access token     |
| POST   | /api/v1/auth/logout   | No            | Logout current session   |
| POST   | /api/v1/auth/logout-all | Yes         | Logout all devices       |
| GET    | /api/v1/auth/me       | Yes           | Get current user         |

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run `npm run lint` and `npm run typecheck`
4. Submit PR

---

## 📝 License

MIT
# astrobook-backend
