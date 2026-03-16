# Backend Deployment Guide

This project has:
- frontend on Vercel
- backend API in `server/`
- database on Neon/Postgres

## Recommended deployment target
Use **Render** for the backend.

Reason:
- easiest to connect to an existing GitHub repo
- works well for a separate Node backend
- simple environment variable setup
- easy public URL for Vercel frontend to call

## Files already prepared
- `server/package.json`
- `server/tsconfig.json`
- `render.yaml`

## Deployment steps on Render

### 1. Push latest code to GitHub
Make sure your latest backend changes are pushed.

### 2. Create Render service
1. Open Render dashboard.
2. Click `New +`.
3. Choose `Blueprint` if using `render.yaml`, or choose `Web Service` manually.
4. Connect your GitHub repo.

If using `render.yaml`, Render should detect:
- root directory: `server`
- build command: `npm install && npm run build`
- start command: `npm start`

If creating manually, set:
- Runtime: `Node`
- Root Directory: `server`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

### 3. Set backend environment variables
In Render service settings, add:

- `NODE_ENV=production`
- `DATABASE_URL=your_neon_connection_string`
- `JWT_SECRET=generate_a_long_random_secret`
- `JWT_EXPIRES_IN=7d`
- `BCRYPT_SALT_ROUNDS=12`
- `CORS_ORIGIN=https://wwwww-wheat.vercel.app,https://*.vercel.app`

If your frontend domain changes, update `CORS_ORIGIN`.

### 4. Deploy backend
Trigger deploy.

After deploy, test:
- `https://your-render-service.onrender.com/health`
- `https://your-render-service.onrender.com/api/setup/status`

Expected:
- `/health` returns `{ "ok": true }`

### 5. Apply DB schema if needed
If your database is empty, run locally against the same `DATABASE_URL`:

```bash
cd server
npm run db:push
```

This creates tables in Neon.

### 6. First-time setup
If setup status returns `{"initialized": false}`:

```bash
curl -X POST https://your-render-service.onrender.com/api/setup/init \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Skillnet Learning","name":"Tushar Saini","email":"tushar1@skillnetlearning.com","password":"Skillnet@123"}'
```

If setup status is already `true`, login directly.

### 7. Connect Vercel frontend to backend
In Vercel project settings, add:

- `EXPO_PUBLIC_API_BASE_URL=https://your-render-service.onrender.com`
- `EXPO_PUBLIC_APP_NAME=Warehouse WMS`

Then redeploy the Vercel frontend.

## Verification checklist

### Backend
- `GET /health` works
- `GET /api/setup/status` works
- no CORS errors in browser console

### Frontend
- login page loads
- setup screen appears only if backend says not initialized
- login works with created super admin

## Common failure cases

### 1. CORS blocked
Cause:
- `CORS_ORIGIN` missing frontend URL

Fix:
- set `CORS_ORIGIN=https://wwwww-wheat.vercel.app,https://*.vercel.app`
- redeploy backend

### 2. API unreachable from Vercel
Cause:
- frontend still points to `http://localhost:4000`

Fix:
- change Vercel env `EXPO_PUBLIC_API_BASE_URL`
- redeploy frontend

### 3. Setup screen does not appear
Cause:
- database already has a user

Fix:
- check `GET /api/setup/status`
- if needed, clear DB users/companies intentionally before setup

## Recommended deployment order
1. Deploy backend to Render
2. Confirm backend public URL works
3. Set Vercel frontend env to backend URL
4. Redeploy frontend
5. Run setup or login
