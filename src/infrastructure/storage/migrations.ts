/**
 * SQLite database migrations engine.
 * @module infrastructure/storage/migrations
 */

import type { Database } from "bun:sqlite";

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Database) => void;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: "create_action_logs_table",
    up: (db: Database) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS action_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          action TEXT NOT NULL,
          target_id TEXT,
          details TEXT,
          status TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_action_logs_timestamp ON action_logs(timestamp DESC);
      `);
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_action_logs_action ON action_logs(action);
      `);
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_action_logs_target ON action_logs(target_id);
      `);
    },
  },
  {
    version: 2,
    name: "create_cache_table",
    up: (db: Database) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_cache_updated_at ON cache(updated_at);
      `);
    },
  },
];

/**
 * Runs pending schema migrations within a transaction.
 * @param db - The bun:sqlite Database instance
 */
export function runMigrations(db: Database): void {
  // Ensure migrations tracking table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db
    .query("SELECT version FROM _schema_migrations ORDER BY version ASC")
    .all() as Array<{ version: number }>;

  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      db.transaction(() => {
        migration.up(db);
        const insertStmt = db.prepare(`
          INSERT INTO _schema_migrations (version, name, applied_at)
          VALUES ($version, $name, $applied_at)
        `);
        insertStmt.run({
          $version: migration.version,
          $name: migration.name,
          $applied_at: new Date().toISOString(),
        });
      })();
    }
  }
}
