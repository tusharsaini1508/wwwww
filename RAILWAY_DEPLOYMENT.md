# Railway Deployment (Backend + Frontend + Database)

This repository contains a monorepo-style setup:

- Frontend app at `/`
- Backend API at `/server`

Recommended "one roof" setup on Railway:

- Service 1: `PostgreSQL`
- Service 2: `backend` (root directory `server`)
- Service 3: `frontend-web` (root directory `/`)

This keeps everything in one Railway project and prevents mismatched API hostnames.

## 1. Create services in one Railway project

1. Create a Railway project.
2. Add `PostgreSQL`.
3. Add a `backend` service from this repository.
4. Add a `frontend-web` service from this repository.

## 2. Configure backend service

1. Open backend service settings.
2. Set `Root Directory` to `server`.
3. Set `Config as Code File` to `/server/railway.toml`.

Why this matters:

- Railway monorepos should use a root directory for the service.
- Railway config files do not automatically follow the root directory, so the config path must be absolute.

## 3. Configure frontend-web service

The frontend Railway config is stored in:

- [`railway.frontend.toml`](/home/codewithmishu/wwwww/railway.frontend.toml)

Set frontend service settings:

1. `Root Directory` = `/`
2. `Config as Code File` = `/railway.frontend.toml`

This builds Expo web output (`dist`) and serves it on Railway.

## 4. Build and start behavior

The backend Railway config is stored in:

- [`server/railway.toml`](/home/codewithmishu/wwwww/server/railway.toml)

It configures:

- `RAILPACK` builder
- build command: `npm run build`
- start command: `npm start`
- health check path: `/health`

## 5. Add PostgreSQL

1. In the same Railway project, add `PostgreSQL`.
2. In the backend service variables, set:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

If your database service has another name, replace `Postgres` with that service name.

## 6. Required backend variables

Set these in the Railway backend service:

```env
NODE_ENV=production
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=https://${{frontend-web.RAILWAY_PUBLIC_DOMAIN}},http://localhost:8081,http://localhost:19006

DEFAULT_COMPANY_NAME=Mindbridge Innovation
SUPER_ADMIN_NAME=Tushar Saini
SUPER_ADMIN_EMAIL=tushar1@skillnetlearning.com
SUPER_ADMIN_PASSWORD=Skillnet@123
```

## 7. Required frontend variables

Set this in the `frontend-web` service variables:

```env
EXPO_PUBLIC_API_BASE_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

This is the key setting that avoids stale API domains when Railway generates/changes URLs.

## 8. Initialize the database

After the backend deploys successfully, run:

```bash
cd server
npm run db:push
```

You can run this locally against the Railway service variables, or from a Railway shell/SSH session.

## 9. Auto bootstrap behavior

The backend now supports env-based bootstrap on startup:

- if the database is empty
- and the super admin env variables are set

then the backend will automatically create:

- the company from `DEFAULT_COMPANY_NAME`
- the super admin from `SUPER_ADMIN_*`

This logic is implemented in:

- [`server/src/lib/bootstrap.ts`](/home/codewithmishu/wwwww/server/src/lib/bootstrap.ts)
- [`server/src/index.ts`](/home/codewithmishu/wwwww/server/src/index.ts)

## 10. Verify

Check:

```bash
GET /health
GET /api/setup/status
POST /api/auth/login
```

If the DB was empty and bootstrap worked, login should succeed with the configured super admin env credentials.

