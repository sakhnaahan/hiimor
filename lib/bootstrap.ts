import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

async function execute(sql: string) {
  await prisma.$executeRawUnsafe(sql);
}

async function addColumnIfMissing(tableName: string, columnName: string, columnDefinition: string) {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info(${tableName});`);
  if (!columns.some((column) => column.name === columnName)) {
    await execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`);
  }
}

async function ensureSqliteSchema() {
  await execute("PRAGMA foreign_keys = ON;");

  await execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      status TEXT NOT NULL DEFAULT 'pending',
      coin_balance INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
      payout_multiplier REAL NOT NULL DEFAULT 2.0,
      admin_contact_text TEXT NOT NULL DEFAULT 'Contact the admin to recharge your coin balance.',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS race_results (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      selected_horse TEXT NOT NULL,
      selected_horse_no TEXT,
      winning_horse TEXT NOT NULL,
      winning_horse_no TEXT,
      bet_amount INTEGER NOT NULL,
      multiplier_used REAL NOT NULL,
      payout INTEGER NOT NULL,
      result TEXT NOT NULL,
      hkjc_race_date TEXT,
      hkjc_racecourse_code TEXT,
      hkjc_racecourse_name TEXT,
      hkjc_race_no INTEGER,
      hkjc_race_name TEXT,
      hkjc_race_start_time TEXT,
      settled_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT race_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await addColumnIfMissing("race_results", "selected_horse_no", "selected_horse_no TEXT");
  await addColumnIfMissing("race_results", "winning_horse_no", "winning_horse_no TEXT");
  await addColumnIfMissing("race_results", "hkjc_race_date", "hkjc_race_date TEXT");
  await addColumnIfMissing("race_results", "hkjc_racecourse_code", "hkjc_racecourse_code TEXT");
  await addColumnIfMissing("race_results", "hkjc_racecourse_name", "hkjc_racecourse_name TEXT");
  await addColumnIfMissing("race_results", "hkjc_race_no", "hkjc_race_no INTEGER");
  await addColumnIfMissing("race_results", "hkjc_race_name", "hkjc_race_name TEXT");
  await addColumnIfMissing("race_results", "hkjc_race_start_time", "hkjc_race_start_time TEXT");
  await addColumnIfMissing("race_results", "settled_at", "settled_at DATETIME");

  await execute(`
    CREATE TABLE IF NOT EXISTS coin_transactions (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      related_race_id INTEGER,
      admin_id INTEGER,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT coin_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT coin_transactions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT coin_transactions_related_race_id_fkey FOREIGN KEY (related_race_id) REFERENCES race_results (id) ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      target_user_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT admin_audit_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
}

async function bootstrapData() {
  await ensureSqliteSchema();

  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (username && password) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          username,
          passwordHash,
          role: "admin",
          status: "approved",
          coinBalance: 0,
        },
      });
    }
  }

  bootstrapped = true;
}

export async function ensureBootstrapData() {
  if (bootstrapped) {
    return;
  }

  bootstrapPromise ??= bootstrapData().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });

  await bootstrapPromise;
}
