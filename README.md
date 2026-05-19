# Private Horse Race

Private instant horse race betting app built with Next.js, Prisma, PostgreSQL, and signed cookie auth.

## Setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Copy `.env.example` to `.env` and set:

```txt
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-this-password"
SESSION_SECRET="replace-with-a-long-random-string"
CRON_SECRET="replace-with-a-long-random-string"
```

3. Apply the Prisma migrations and seed the first admin:

```powershell
npm.cmd run db:setup
```

4. Start the app:

```powershell
npm.cmd run dev
```

Open `http://localhost:3000`.

## Commands

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run db:setup
```

`db:setup` is the supported local database setup command for this project. It applies the committed Prisma migrations, ensures app settings exist, and seeds the first admin from environment variables.

## Railway

This project is deployed as a persistent Railway web service with PostgreSQL. Keep these environment variables set before deploying:

```txt
DATABASE_URL="${{Postgres.DATABASE_URL}}"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-this-password"
SESSION_SECRET="replace-with-a-long-random-string"
CRON_SECRET="replace-with-a-long-random-string"
NODE_ENV="production"
```

Railway should use:

```txt
Build Command: prisma generate && next build
Start Command: npm run start
Pre-deploy Command: prisma migrate deploy
```

Do not configure the main Railway app service as a scheduled/cron-only service. It must run continuously as the web server. Use external `cron-job.org` to call `/api/cron/hkjc-sync` with either `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.

After deployment:

```powershell
curl.exe https://YOUR-RAILWAY-DOMAIN/api/health
curl.exe -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-RAILWAY-DOMAIN/api/health/hkjc
curl.exe -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-RAILWAY-DOMAIN/api/cron/hkjc-sync
```

Then open `/race` and inspect race tabs. Player pages should never show fallback runners such as `GOLDEN SIXTY STAR` or brand numbers like `F001`; if HKJC data is unavailable, the app should show an unavailable state instead.

## Admin Flow

- Public signup creates pending player accounts with 0 coins.
- The seeded admin approves or rejects signup requests.
- Approved players can log in, race, and view history.
- Admins can recharge coins, promote approved users, update payout settings, and view audit logs.
