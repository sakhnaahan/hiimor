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
```

3. Push the Prisma schema and seed the first admin:

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

`db:setup` is the supported local database setup command for this project. It pushes the Prisma schema, ensures app settings exist, and seeds the first admin from environment variables.

## Vercel

This project is connected to Prisma Postgres on Vercel. Keep these environment variables set before deploying:

```txt
DATABASE_URL="postgresql://..."
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-this-password"
SESSION_SECRET="replace-with-a-long-random-string"
```

The Vercel build runs `prisma db push` before `next build`, so the hosted PostgreSQL schema is kept in sync on deployment.

## Admin Flow

- Public signup creates pending player accounts with 0 coins.
- The seeded admin approves or rejects signup requests.
- Approved players can log in, race, and view history.
- Admins can recharge coins, promote approved users, update payout settings, and view audit logs.
