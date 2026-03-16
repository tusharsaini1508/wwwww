# Database Recommendation And Setup Guide

## Recommended choice for this project
Use **Neon (PostgreSQL)** as the primary database.

Why Neon is a better fit than MongoDB for this WMS app:
- Your data is relational: companies, users, roles, warehouses, bins, items, BOM lines, orders, transfers.
- You need integrity constraints and transactions (especially inventory movements).
- SQL queries are strong for analytics and reporting.
- Neon is serverless Postgres, easy to scale and cost-efficient.

MongoDB is good for flexible documents and event logs, but for inventory/accounting style flows, Postgres usually stays cleaner and safer.

## Important architecture rule
Do **not** connect Expo client directly to Neon/Mongo with secrets.
Use this pattern:
1. Expo app (client)
2. Backend API (server)
3. Database (Neon)

## Step-by-step implementation plan

### 1. Create Neon database
1. Sign in to Neon.
2. Create a new project and database.
3. Copy the Postgres connection string.
4. Put it in `.env` as `DATABASE_URL`.

### 2. Create backend API (recommended as separate folder `server/`)
From repo root:

```bash
mkdir server && cd server
npm init -y
npm i fastify @fastify/cors zod dotenv jsonwebtoken bcryptjs
npm i drizzle-orm postgres
npm i -D typescript tsx @types/node drizzle-kit
```

Create `server/.env` from root template values.

### 3. Configure Drizzle + Postgres
1. Add `server/drizzle.config.ts`.
2. Add `server/src/db/client.ts` to create the Postgres client from `DATABASE_URL`.
3. Add `server/src/db/schema.ts`.

Start with these core tables:
- `companies`
- `users` (store `password_hash`, not plaintext password)
- `warehouses`
- `locations`
- `bins`
- `items`
- `inventory_balances`
- `inventory_movements` (append-only ledger)
- `suppliers`
- `purchase_orders`
- `sales_orders`
- `work_orders`

### 4. Add migrations
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 5. Build auth endpoints first
Create endpoints:
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Rules:
- Validate email/password.
- Hash passwords with `bcrypt`.
- Issue JWT from backend.
- Never return password hash.

### 6. Build minimal domain endpoints
Implement in this order:
1. `GET /companies`
2. `GET /users` + `POST /users`
3. `GET /items` + `POST /items`
4. `GET /inventory` + `POST /inventory/move`

For inventory updates, always write to `inventory_movements` and update balances in one DB transaction.

### 7. Connect frontend to backend
In Expo app:
1. Keep only UI state in Zustand.
2. Replace direct local mutations with API calls.
3. Keep auth token in secure storage for mobile and local storage for web if needed.
4. Use `EXPO_PUBLIC_API_BASE_URL` from `.env`.

### 8. Deploy backend and frontend
- Frontend can stay on Vercel static hosting.
- Backend can run on Railway/Render/Fly.io/Vercel Functions.
- Set environment variables in the backend hosting platform.

### 9. Production checklist
- Enforce HTTPS only.
- Rotate `JWT_SECRET` regularly.
- Add request rate limiting.
- Add DB indexes for hot queries.
- Add backups and point-in-time restore in Neon.
- Add audit logging for role/permission changes.

## Optional: where MongoDB can still help
If you want MongoDB, use it as a secondary store for:
- audit/event streams
- flexible logs
- long-running workflow payloads

Keep transactional inventory and core master data in Neon/Postgres.
