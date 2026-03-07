# Astrobook Backend – API Payloads Reference

Base URL: `http://localhost:3000/api/v1`

All authenticated requests require:
```
Authorization: Bearer <accessToken>
```

---

## Health Check

### GET /health
No auth required. No body.

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-07T10:00:00.000Z",
  "uptime": 123.45
}
```

---

## Auth

### POST /auth/login
Authenticate with a Firebase ID token (get this from Firebase client SDK).

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "platform": "web"
  }
}
```

**Expected Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "firebaseUid": "firebase_uid_here",
    "email": "john.doe@example.com",
    "phone": null,
    "name": "John Doe",
    "role": "user",
    "isOnboarded": false
  }
}
```

---

### POST /auth/refresh
Exchange a refresh token for a new access token.

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Expected Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST /auth/logout
Invalidates the current session. Reads the token from the `Authorization` header.
No request body.

**Expected Response: 204 No Content**

---

### POST /auth/logout-all
[AUTH REQUIRED] Invalidates all sessions for the current user.
No request body.

**Expected Response: 204 No Content**

---

### GET /auth/me
[AUTH REQUIRED] Returns the current authenticated user.
No request body.

**Expected Response (200):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "firebaseUid": "firebase_uid_here",
  "email": "john.doe@example.com",
  "phone": null,
  "name": "John Doe",
  "role": "user",
  "isOnboarded": false,
  "createdAt": "2026-03-07T10:00:00.000Z"
}
```

---

## Users

### POST /users/onboarding
[AUTH REQUIRED] Complete first-time user onboarding.
Must be called once after login before accessing other user features.

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+919876543210",
  "dateOfBirth": "1995-06-15",
  "interests": ["Astrology", "Tarot", "Numerology"]
}
```

Valid interests:
`Numerology`, `Vastu`, `Past Life`, `Reiki`, `Tarot`, `Astrology`,
`Palmistry`, `Face Reading`, `Kundli`, `Horoscope`, `Gemstones`, `Meditation`

**Expected Response (200):**
```json
{
  "message": "Onboarding complete",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "John Doe",
    "isOnboarded": true
  }
}
```

---

### GET /users/me
[AUTH REQUIRED] Get the current user's full profile.
No request body.

**Expected Response (200):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "firebaseUid": "firebase_uid_here",
  "email": "john.doe@example.com",
  "phone": "+919876543210",
  "name": "John Doe",
  "dateOfBirth": "1995-06-15",
  "role": "user",
  "interests": ["Astrology", "Tarot"],
  "isOnboarded": true,
  "isAstrologer": false,
  "createdAt": "2026-03-07T10:00:00.000Z",
  "updatedAt": "2026-03-07T10:00:00.000Z"
}
```

---

### PATCH /users/me
[AUTH REQUIRED] Update user profile fields (all fields optional).

```json
{
  "name": "John Updated",
  "dateOfBirth": "1995-06-20",
  "interests": ["Tarot", "Kundli", "Horoscope"]
}
```

**Expected Response (200):** Updated user object.

---

### POST /users/upgrade-to-astrologer
[AUTH REQUIRED] Upgrade the current user's role to astrologer.
No request body.

**Expected Response (200):**
```json
{
  "message": "User upgraded to astrologer",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "role": "astrologer"
  }
}
```

---

### GET /users/interests
Public endpoint. No auth, no body.
Returns all valid interest options.

**Expected Response (200):**
```json
{
  "interests": [
    "Numerology",
    "Vastu",
    "Past Life",
    "Reiki",
    "Tarot",
    "Astrology",
    "Palmistry",
    "Face Reading",
    "Kundli",
    "Horoscope",
    "Gemstones",
    "Meditation"
  ]
}
```

---

## Consultation – Astrologer Routes
> These routes require role: `astrologer` or `admin`

---

### POST /consultation/services
[AUTH REQUIRED – astrologer/admin] Create or update a consultation service.
Uses upsert logic based on `(astrologerId, serviceCode)`.

Service codes:
- `101` – Chat
- `102` – Call
- `103` – Video Call
- `104` – In-Person

```json
{
  "serviceCode": 102,
  "title": "Vedic Astrology Call",
  "shortDescription": "Get personalized Vedic astrology insights over a call session.",
  "coverImage": "https://example.com/images/vedic-call.jpg",
  "about": "In this 30-minute call session, I will analyze your birth chart using Vedic astrology principles and provide guidance on career, relationships, and life path.",
  "durationMinutes": 30,
  "price": 599
}
```

**Expected Response (200):**
```json
{
  "message": "Service saved",
  "service": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "astrologerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "serviceCode": 102,
    "title": "Vedic Astrology Call",
    "durationMinutes": 30,
    "price": "599"
  }
}
```

---

### GET /consultation/services/mine
[AUTH REQUIRED – astrologer/admin] List all services created by the logged-in astrologer.
No request body.

**Expected Response (200):**
```json
{
  "services": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "serviceCode": 102,
      "title": "Vedic Astrology Call",
      "shortDescription": "Get personalized Vedic astrology insights over a call session.",
      "durationMinutes": 30,
      "price": "599"
    }
  ]
}
```

---

### POST /consultation/availability
[AUTH REQUIRED – astrologer/admin] Set an availability window for a specific date.
One window per date (upserts on conflict).

```json
{
  "date": "2026-03-15",
  "startTime": "09:00",
  "endTime": "13:00",
  "timezone": "Asia/Kolkata"
}
```

**Expected Response (201):**
```json
{
  "message": "Availability set",
  "availability": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "astrologerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "date": "2026-03-15",
    "startTime": "09:00",
    "endTime": "13:00",
    "timezone": "Asia/Kolkata"
  }
}
```

---

### GET /consultation/availability/mine
[AUTH REQUIRED – astrologer/admin] List upcoming availability windows for the logged-in astrologer.
No request body.

**Expected Response (200):**
```json
{
  "availability": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "date": "2026-03-15",
      "startTime": "09:00",
      "endTime": "13:00",
      "timezone": "Asia/Kolkata"
    }
  ]
}
```

---

### DELETE /consultation/availability/:id
[AUTH REQUIRED – astrologer/admin] Remove an availability window by ID.
No request body.

**Example:** `DELETE /consultation/availability/c3d4e5f6-a7b8-9012-cdef-123456789012`

**Expected Response: 204 No Content**

---

## Consultation – User Routes

---

### GET /consultation/astrologers/:astrologerId/services
Public. Browse all services offered by a specific astrologer.
No auth, no body.

**Example:** `GET /consultation/astrologers/a1b2c3d4-e5f6-7890-abcd-ef1234567890/services`

**Expected Response (200):**
```json
{
  "services": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "serviceCode": 102,
      "title": "Vedic Astrology Call",
      "shortDescription": "Get personalized Vedic astrology insights over a call session.",
      "coverImage": "https://example.com/images/vedic-call.jpg",
      "durationMinutes": 30,
      "price": "599"
    }
  ]
}
```

---

### GET /consultation/astrologers/:astrologerId/available-dates
Public. Get all dates on which the astrologer has availability (for calendar highlighting).
No auth, no body.

**Example:** `GET /consultation/astrologers/a1b2c3d4-e5f6-7890-abcd-ef1234567890/available-dates`

**Expected Response (200):**
```json
{
  "availableDates": [
    "2026-03-15",
    "2026-03-16",
    "2026-03-20"
  ]
}
```

---

### POST /consultation/appointments
[AUTH REQUIRED – user] Book a consultation slot.
The backend auto-allocates a random free 15-min aligned slot within the astrologer's availability window and generates a Google Meet link.

```json
{
  "astrologerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "serviceId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "date": "2026-03-15",
  "notes": "I want to know about my career prospects for 2026."
}
```

**Expected Response (201):**
```json
{
  "message": "Appointment booked",
  "appointment": {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "scheduledAt": "2026-03-15T05:30:00.000Z",
    "endsAt": "2026-03-15T06:00:00.000Z",
    "durationMinutes": 30,
    "meetLink": "https://meet.google.com/abc-defg-hij",
    "status": "confirmed",
    "astrologerId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "e5f6a7b8-c9d0-1234-efab-345678901234"
  }
}
```

---

### GET /consultation/appointments/mine
[AUTH REQUIRED] Get all appointments for the logged-in user (works for both users and astrologers).
No request body.

**Expected Response (200):**
```json
{
  "appointments": [
    {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "scheduledAt": "2026-03-15T05:30:00.000Z",
      "endsAt": "2026-03-15T06:00:00.000Z",
      "durationMinutes": 30,
      "meetLink": "https://meet.google.com/abc-defg-hij",
      "status": "confirmed",
      "notes": "I want to know about my career prospects for 2026."
    }
  ]
}
```

---

### PATCH /consultation/appointments/:id/cancel
[AUTH REQUIRED] Cancel an appointment by ID.
No request body.

**Example:** `PATCH /consultation/appointments/d4e5f6a7-b8c9-0123-defa-234567890123/cancel`

**Expected Response: 204 No Content**

---

## Testing Flow (Step-by-Step)

Follow this order for end-to-end manual testing:

1. **Login** – `POST /auth/login` with Firebase idToken → save `accessToken` + `refreshToken`
2. **Onboard user** – `POST /users/onboarding` with auth
3. **Get profile** – `GET /users/me` to verify
4. **Upgrade to astrologer** – `POST /users/upgrade-to-astrologer`
5. **Create a service** – `POST /consultation/services` (now as astrologer)
6. **Set availability** – `POST /consultation/availability` for a future date
7. **View availability** – `GET /consultation/available-dates` (public, use astrologerId from step 1)
8. **Login as a different user** (or refresh and test as the same user)
9. **Browse services** – `GET /consultation/astrologers/:id/services`
10. **Book appointment** – `POST /consultation/appointments` (use serviceId from step 5)
11. **View appointments** – `GET /consultation/appointments/mine`
12. **Cancel appointment** – `PATCH /consultation/appointments/:id/cancel`
13. **Refresh token** – `POST /auth/refresh`
14. **Logout** – `POST /auth/logout`

---

## Common Error Responses

```json
{ "statusCode": 401, "error": "Unauthorized", "message": "Missing or invalid token" }
{ "statusCode": 403, "error": "Forbidden", "message": "Insufficient role" }
{ "statusCode": 404, "error": "Not Found", "message": "Resource not found" }
{ "statusCode": 400, "error": "Bad Request", "message": "Validation error details" }
{ "statusCode": 409, "error": "Conflict", "message": "No free slots available on this date" }
```
