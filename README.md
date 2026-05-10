# Private Horse Race

Private instant horse race betting app built with Next.js, Prisma, SQLite, and custom session auth.

## Setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Copy `.env.example` to `.env` and set:

```txt
DATABASE_URL="file:./dev.db"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-this-password"
SESSION_SECRET="replace-with-a-long-random-string"
```

3. Create the SQLite database and seed the first admin:

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

`db:setup` is the supported local database setup command for this project. It creates the SQLite tables, ensures app settings exist, and seeds the first admin from environment variables.

## Vercel

Set these environment variables in Vercel before deploying:

```txt
DATABASE_URL="file:./dev.db"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-this-password"
SESSION_SECRET="replace-with-a-long-random-string"
```

SQLite files are not persistent storage on Vercel serverless deployments. For production use, move the Prisma datasource to a hosted database and update `DATABASE_URL` accordingly.

## Admin Flow

- Public signup creates pending player accounts with 0 coins.
- The seeded admin approves or rejects signup requests.
- Approved players can log in, race, and view history.
- Admins can recharge coins, promote approved users, update payout settings, and view audit logs.
