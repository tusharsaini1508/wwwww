# WMS Backend (Fastify + Neon + Drizzle)

## What this provides
- `GET /api/setup/status`
- `POST /api/setup/init`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/companies` (role-aware)
- `GET /api/inventory` (role-aware, optional `?sku=`)

## 1. Install
```bash
cd server
npm install
```

## 2. Configure env
```bash
cp .env.example .env
```
Set at least:
- `DATABASE_URL`
- `JWT_SECRET`

## 3. Create schema in Neon
```bash
npm run db:push
```

## 4. Run API
```bash
npm run dev
```

Health check:
- `GET http://localhost:4000/health`

## First-time setup
```bash
curl -X POST http://localhost:4000/api/setup/init \
  -H "Content-Type: application/json" \
  -d '{"companyName":"My Company","name":"Owner","email":"owner@myco.com","password":"StrongPassword123!"}'
```

Check status:
```bash
curl http://localhost:4000/api/setup/status
```

## Login example
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@myco.com","password":"StrongPassword123!"}'
```

Use returned `accessToken`:
```bash
curl http://localhost:4000/api/companies \
  -H "Authorization: Bearer <token>"
```

## Notes
- Keep DB and JWT secrets server-side only.
- Expo app should call this API using `EXPO_PUBLIC_API_BASE_URL`.
- Setup endpoint works only when no users exist in DB.
