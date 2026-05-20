# Put Duck Data

A Ghana data bundle reseller platform. Customers buy MTN, AirtelTigo, and Telecel data bundles, fund wallets via Paystack MoMo, and resellers earn commissions on referrals. Data delivery is fully automated via the 1Papi provider API.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, TailwindCSS |
| Backend | Node.js 20+, Express |
| Database | Neon PostgreSQL (serverless) |
| Provider | 1Papi (`https://www.1papi.com/api/v1`) |
| Payments | Paystack (Mobile Money) |
| Deployment | Vercel |

---

## Project Structure

```
Put Duck Data/
├── frontend/          # React + Vite app
│   └── src/
│       ├── pages/     # Route pages (Landing, Login, Dashboard, Buy, etc.)
│       └── components/
├── backend/
│   ├── api/
│   │   └── index.js   # Express app + all routes
│   ├── handlers/      # One file per API endpoint
│   ├── utils/
│   │   ├── onepapi.js        # 1Papi provider integration
│   │   ├── db.js             # Neon DB connection
│   │   ├── auth.js           # JWT authentication
│   │   ├── email.js          # Nodemailer (SMTP)
│   │   └── notifications.js  # In-app notifications
│   ├── scripts/       # Operational scripts (see below)
│   ├── database/
│   │   └── schema.sql # Full DB schema
│   └── server.js      # Local dev server (port 8888)
├── vercel.json        # Vercel deployment config
└── package.json
```

---

## Quick Start (Local Dev)

### 1. Install dependencies
```bash
npm run install-all
```

### 2. Configure environment
Fill in `backend/.env`:
```env
DATABASE_URL=your_neon_connection_string
JWT_SECRET=your_secret_key
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
ONEPAPI_API_KEY=sk_live_...
FRONTEND_URL=https://yourdomain.com
```

### 3. Set up database
```bash
cd backend && node scripts/run-all-pending-migrations.js
```

### 4. Create admin account
```bash
cd backend && node scripts/create-admin.js
# Override via env: ADMIN_EMAIL=you@email.com ADMIN_PASSWORD=YourPass node scripts/create-admin.js
```

### 5. Sync plans from 1Papi
```bash
cd backend && node scripts/sync-provider-prices-v2.js
```

### 6. Run locally
```bash
# Backend (port 8888)
cd backend && npm run dev

# Frontend (port 5173, in a separate terminal)
cd frontend && npm run dev
```

---

## Deploy to Vercel

```bash
cd backend && npm run deploy
```

Vercel serves `backend/api/index.js` as a serverless function. The frontend builds to `frontend/dist/` and is served as static files.

---

## API Routes

All routes are prefixed with `/api/`.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/auth-login` | Login |
| POST | `/auth-register` | Register |
| POST | `/auth-logout` | Logout |
| GET | `/auth-verify` | Verify token |
| POST | `/token-refresh` | Refresh JWT |

### Data & Purchases
| Method | Route | Description |
|---|---|---|
| GET | `/data-plans` | List active plans |
| POST | `/data-purchase` | Buy data (wallet funds) |
| POST | `/guest-purchase` | Guest buy via Paystack MoMo |
| GET | `/guest-order-track` | Track guest order |
| POST | `/order-status-check` | Poll order status from provider |

### Payments
| Method | Route | Description |
|---|---|---|
| POST | `/payment-initialize` | Init Paystack transaction |
| GET | `/payment-verify` | Verify payment + deliver data |
| POST | `/paystack-webhook` | Paystack charge.success handler |
| POST | `/payment-webhook` | Generic payment webhook |

### Admin
| Method | Route | Description |
|---|---|---|
| ALL | `/admin-orders` | Bulk verify & re-deliver orders |
| ALL | `/admin-plans-manage` | CRUD data plans |
| ALL | `/admin-users-manage` | CRUD users |
| ALL | `/admin-site-settings` | Site/maintenance settings |
| GET | `/auto-sync-plans` | Trigger 1Papi price sync |
| ALL | `/admin-provider` | Provider plan management |
| ALL | `/admin-momo-manage` | Manual MoMo payment approvals |

### Reseller
| Method | Route | Description |
|---|---|---|
| POST | `/reseller-activate` | Become a reseller |
| GET | `/reseller-stats` | Earnings & referral stats |
| POST | `/reseller-set-pricing` | Set custom plan prices |

---

## Operational Scripts

Run from the `backend/` directory:

| Script | Purpose |
|---|---|
| `node scripts/create-admin.js` | Create or update the admin account |
| `node scripts/run-all-pending-migrations.js` | Run all DB migrations (idempotent, safe to re-run) |
| `node scripts/run-fix-migrations.js` | Rebuild missing indexes and DB views |
| `node scripts/sync-provider-prices-v2.js` | Sync 1Papi plan prices into DB (fuzzy match) |
| `node scripts/sync-provider-prices.js` | Sync 1Papi prices (exact match) |
| `node scripts/sync-guest-orders.js` | Poll stuck guest orders from provider |
| `node scripts/activate-plans.js` | Enable all data plans |
| `node scripts/cleanup-unpaid-purchases.js` | Remove stale unpaid purchase records |
| `node scripts/clear-broadcasts.js` | Deactivate all active broadcasts |
| `node scripts/test-provider.js` | Verify 1Papi API connection |

---

## Provider — 1Papi

All data delivery runs through 1Papi exclusively.

```
ONEPAPI_API_KEY=sk_live_...   ← set in backend/.env
```

**Endpoints used:**
- `GET /plans` — fetch available plans
- `POST /buy` — place a data order
- `GET /status?reference=...` — check order delivery status

**Weekly auto-sync:** Every Sunday at midnight Ghana time, the server pulls fresh prices from 1Papi and updates the database automatically.

**Manual sync:** Hit `GET /api/auto-sync-plans` (admin auth required) or run `sync-provider-prices-v2.js`.

---

## Networks Supported

| Network | Phone Prefixes |
|---|---|
| MTN | 024, 025, 053, 054, 055, 059 |
| Telecel | 020, 050 |
| AirtelTigo | 026, 027, 056, 057 |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (keep strong) |
| `PAYSTACK_SECRET_KEY` | Yes | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | Yes | Paystack public key |
| `ONEPAPI_API_KEY` | Yes | 1Papi API key |
| `FRONTEND_URL` | Yes | Allowed CORS origin (e.g. `https://yourdomain.com`) |
| `SMTP_HOST` | Optional | SMTP server for emails |
| `SMTP_PORT` | Optional | SMTP port (usually 587) |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASS` | Optional | SMTP app password |
| `FROM_EMAIL` | Optional | Sender email address |
| `FROM_NAME` | Optional | Sender display name |
| `NODE_ENV` | Optional | `development` or `production` |
| `PORT` | Optional | Local dev port (default: 8888) |
