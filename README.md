# Шақыру — AI Online Invitation Constructor

Premium SaaS platform for creating beautiful digital event invitations, built for the Kazakhstan market.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, standalone) |
| Language | TypeScript 5 (strict) |
| Styling | TailwindCSS 4 |
| Database | PostgreSQL 16 via Prisma 7 |
| Auth | JWT (jose) + bcryptjs |
| Payments | Manual Kaspi MVP · APIpay stub · CloudPayments stub |
| Storage | MinIO / S3-compatible (placeholder, see below) |
| Automation | n8n webhook integration |
| Deployment | Docker · Coolify v4 |

---

## Local Development

### 1. Prerequisites

- Node.js 22+
- Docker & Docker Compose

### 2. Clone and install

```bash
git clone <repo>
cd inviteSaaS
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Fill in all values — especially DATABASE_URL and AUTH_SECRET
```

Generate secrets:
```bash
openssl rand -base64 32   # → AUTH_SECRET
openssl rand -hex 32      # → CRON_SECRET, N8N_WEBHOOK_SECRET, WEBHOOK_SECRET_*
```

### 4. Start PostgreSQL

```bash
docker compose up db -d
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
# or, if schema already exists:
npx prisma db push
```

### 6. Generate Prisma client

```bash
npx prisma generate
```

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 8. Create the first admin user

Register a normal account at `/auth/register`, then promote it via Prisma Studio or psql:

```bash
npx prisma studio
# or:
psql $DATABASE_URL -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your@email.com';"
```

---

## Production — Docker Compose

```bash
# Build and start
docker compose up --build -d

# Run migrations (one-time or after schema changes)
docker compose --profile migrate up migrate

# View logs
docker compose logs -f app
```

---

## Production — Coolify v4.0.0-beta.462

### Setup steps

1. In your Coolify instance, create a **New Resource → Application → Git**.
2. Point to this repository. Coolify detects the `Dockerfile` automatically.
3. Set **Build Pack** to `Dockerfile`.
4. Under **Environment Variables**, add every variable from `.env.example`.
5. Under **Advanced → Ports**, expose `3000`.
6. Under **Health Check**, set path to `/api/health`.

### Database

Create a **PostgreSQL** resource in Coolify and copy the connection string to `DATABASE_URL`.

### Migrations

In Coolify **Application → Deployments → Pre-deploy command**, add:

```bash
npx prisma migrate deploy
```

This runs automatically before each deployment.

### Custom domain + SSL

Assign your domain in the **Domains** tab. Coolify provisions Let's Encrypt automatically.

### Environment variables checklist

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | JWT signing secret (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Full URL of your app, e.g. `https://shakiru.kz` |
| `KASPI_PAYMENT_LINK` | ✅ | From Kaspi Business cabinet |
| `KASPI_PHONE_NUMBER` | ✅ | Your Kaspi phone for transfers |
| `CRON_SECRET` | ✅ | For n8n cron endpoint auth |
| `N8N_WEBHOOK_SECRET` | ✅ | For n8n REST API endpoints |
| `WEBHOOK_SECRET_APIPAY` | ⚠️ | Required if using APIpay |
| `WEBHOOK_SECRET_CLOUDPAYMENTS` | ⚠️ | Required if using CloudPayments |
| `S3_ENDPOINT` | ⚠️ | Required for media uploads |

---

## Payment Flow

### Manual Kaspi (MVP — active)

```
User selects plan → POST /api/payments/create
  → Payment row PENDING created
  → Invite status → PENDING_PAYMENT
  → Kaspi instructions shown (phone + reference)

User transfers money via Kaspi
Admin sees payment in /admin
Admin clicks "Approve" → POST /api/admin/payment/manual-approve
  → Payment status → PAID, paidAt set
  → Invite status → PUBLISHED
  → expiresAt = now + plan.days
  → AuditLog written
```

### Online providers (architecture ready, not yet live)

```
POST /api/payments/webhook?provider=APIPAY
POST /api/payments/webhook?provider=CLOUDPAYMENTS
  → Signature verified via HMAC-SHA256
  → Payment updated by externalId
  → Invite published when PAID
  → Raw payload stored in rawPayload JSON
```

### Plan extension

```
User on /dashboard/invites/[id] clicks "Extend"
  → POST /api/invites/extend { inviteId, plan }
  → New Payment PENDING (isExtension: true in rawPayload)
  → User pays via Kaspi (same flow)

Admin approves → manual-approve detects isExtension: true
  → expiresAt extended from CURRENT expiresAt (not from now)
  → Invite status unchanged (stays PUBLISHED)
```

---

## n8n Integration

### Authentication

All n8n → app calls use:
```
Authorization: Bearer <N8N_WEBHOOK_SECRET>
```

### Available endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Health check — use as liveness probe |
| `POST` | `/api/invites/create` | N8N_WEBHOOK_SECRET | Create invite for any user |
| `GET` | `/api/invites/[id]` | Session or N8N_WEBHOOK_SECRET | Get invite details |
| `PATCH` | `/api/invites/[id]` | Session or N8N_WEBHOOK_SECRET | Update invite fields |
| `POST` | `/api/payments/create` | Session | Start Kaspi payment |
| `POST` | `/api/payments/webhook` | HMAC signature | Receive provider webhook |
| `POST` | `/api/guests/rsvp` | N8N_WEBHOOK_SECRET | Create RSVP (chatbot flow) |
| `POST` | `/api/admin/payment/manual-approve` | Admin session | Approve pending payment |
| `POST` | `/api/admin/cron/expire-invites` | CRON_SECRET | Mark expired invites |
| `POST` | `/api/invites/extend` | Session | Start plan extension payment |

### Suggested n8n workflows

**1. Daily expiry cron**
```
Schedule Trigger (daily 02:00)
  → HTTP Request POST https://yourapp.com/api/admin/cron/expire-invites
     Headers: { Authorization: "Bearer {{$env.CRON_SECRET}}" }
```

**2. WhatsApp RSVP bot**
```
WhatsApp/Telegram trigger
  → Parse guest response
  → HTTP Request POST /api/guests/rsvp
     Headers: { Authorization: "Bearer {{$env.N8N_WEBHOOK_SECRET}}" }
     Body: { inviteId, name, phone, status, peopleCount }
```

**3. Auto-create invite from CRM**
```
CRM webhook trigger
  → HTTP Request POST /api/invites/create
     Headers: { Authorization: "Bearer {{$env.N8N_WEBHOOK_SECRET}}" }
     Body: { userId, eventType, title, person1, ... }
```

---

## Storage / MinIO

### Setup MinIO locally

Add to `docker-compose.yml`:

```yaml
minio:
  image: minio/minio
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  ports:
    - "9000:9000"
    - "9001:9001"
  volumes:
    - minio_data:/data
```

Add to `volumes:`: `minio_data:`

Set in `.env`:
```
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=invitesaas
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

### Activating media upload

1. Install SDK: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
2. Implement `uploadFile()` and `getSignedUrl()` in `src/lib/storage.ts`
3. Add upload route at `POST /api/media/upload`
4. Connect to the `Media` Prisma model

---

## Database Migrations

```bash
# Development — create + apply migration
npx prisma migrate dev --name <description>

# Production — apply pending migrations
npx prisma migrate deploy

# Inspect database with GUI
npx prisma studio

# Push schema without migration (dev only)
npx prisma db push
```

---

## Project Structure

```
src/
  app/
    (auth)/         Login / Register pages
    admin/          Admin panel — payments, invites, users, audit log
    api/
      admin/        Admin API routes
      guests/       RSVP REST endpoint
      health/       Liveness probe
      invites/      n8n REST endpoints + extend
      payments/     Create payment, webhook
    create/         7-step invite wizard
    dashboard/      User dashboard + invite detail with guest list
    i/[slug]/       Public invite page + RSVP form
  components/
    dashboard/      StatusBadge, CopyButton, LogoutButton
    payment/        PaymentFlow, KaspiInstructions
    ui/             Button, Input, Select, Textarea, Card, Stepper
    StaticInviteCard.tsx
  lib/
    auth.ts         JWT session (jose)
    db.ts           Prisma singleton (PrismaPg adapter)
    n8n-auth.ts     N8N_WEBHOOK_SECRET verification
    password.ts     bcryptjs helpers
    slug.ts         Kazakh/Cyrillic slug generation
    storage.ts      MinIO/S3 placeholder
    payment/
      plans.ts      BASIC/STANDARD/PREMIUM plan constants
      signature.ts  HMAC webhook signature verification
      providers/    kaspi · apipay · cloudpayments
  types/
    invite.ts       Zod schemas, THEMES (7), EVENT_TYPES (6)
  middleware.ts     Edge JWT guard for /dashboard and /admin
prisma/
  schema.prisma     Full production schema
```

---

## Expiry Logic

- `expiresAt` is set when a payment is approved (`now + plan.days`)
- For extensions, `expiresAt` is extended from the **current** `expiresAt`
- Public page checks both `status === "EXPIRED"` **and** `expiresAt < now` (catches the gap before cron runs)
- Cron endpoint bulk-updates stale invites:

```bash
curl -X POST https://yourapp.com/api/admin/cron/expire-invites \
  -H "Authorization: Bearer $CRON_SECRET"
# Response: { "expired": 3, "runAt": "2026-05-05T02:00:00Z" }
```

---

## Themes

| ID | Name | Style |
|---|---|---|
| `ROSE_GOLD` | Rose Gold | Romantic pink gradient |
| `MIDNIGHT` | Midnight Blue | Dark elegant |
| `EMERALD` | Emerald Garden | Natural green |
| `IVORY` | Ivory Classic | Classic amber |
| `KAZAKH` | Kazakh Heritage | National red/gold |
| `PINK_UZATU` | Ұзату | Soft pink for Uzatu ceremony |
| `KIDS_BIRTHDAY` | Балалар тойы | Bright orange/yellow for kids |

---

## Security Checklist

- [x] JWT sessions (HTTP-only cookie, 30d, secure in production)
- [x] bcrypt password hashing (12 rounds)
- [x] Constant-time login (prevents timing attacks)
- [x] Middleware edge JWT guard on `/dashboard` and `/admin`
- [x] Ownership checks in every data access layer
- [x] Zod validation on all mutations
- [x] HMAC-SHA256 + `timingSafeEqual` for webhooks
- [x] CRON_SECRET for cron endpoint
- [x] N8N_WEBHOOK_SECRET for server-to-server endpoints
- [x] Raw webhook payload stored for audit trail
- [x] In-memory rate limiter on RSVP (5 req/IP/hour — replace with Redis for scale)
- [x] No secrets in client bundles
