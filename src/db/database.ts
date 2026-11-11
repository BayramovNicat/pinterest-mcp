import { Database } from "bun:sqlite";

export interface ActionLog {
  id: number;
  timestamp: string;
  action: string;
  target_id: string | null;
  details: string | null;
  status: string;
}

export class LocalStore {
  private db: Database;

  constructor(dbPath: string = "pinterest.db") {
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS action_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        target_id TEXT,
        details TEXT,
        status TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_action_logs_timestamp ON action_logs(timestamp DESC);
    `);
  }

  public logAction(
    action: string,
    targetId: string | null = null,
    details: any = null,
    status: string = "SUCCESS"
  ): ActionLog {
    const timestamp = new Date().toISOString();
    const detailsStr = details ? (typeof details === "string" ? details : JSON.stringify(details)) : null;

    const query = this.db.prepare(`
      INSERT INTO action_logs (timestamp, action, target_id, details, status)
      VALUES ($timestamp, $action, $targetId, $details, $status)
      RETURNING id, timestamp, action, target_id, details, status
    `);

    const result = query.get({
      $timestamp: timestamp,
      $action: action,
      $targetId: targetId,
      $details: detailsStr,
      $status: status,
    }) as ActionLog;

    return result;
  }

  public getRecentActions(limit: number = 20): ActionLog[] {
    const query = this.db.prepare(`
      SELECT id, timestamp, action, target_id, details, status
      FROM action_logs
      ORDER BY id DESC
      LIMIT $limit
    `);
    return query.all({ $limit: limit }) as ActionLog[];
  }

  public setCache(key: string, value: any): void {
    const now = new Date().toISOString();
    const valueStr = JSON.stringify(value);
    const query = this.db.prepare(`
      INSERT INTO cache (key, value, updated_at)
      VALUES ($key, $value, $updated_at)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    query.run({
      $key: key,
      $value: valueStr,
      $updated_at: now,
    });
  }

  public getCache<T>(key: string, maxAgeSeconds?: number): T | null {
    const query = this.db.prepare(`
      SELECT value, updated_at FROM cache WHERE key = $key
    `);
    const row = query.get({ $key: key }) as { value: string; updated_at: string } | undefined;
    if (!row) return null;

    if (maxAgeSeconds) {
      const updatedAtMs = new Date(row.updated_at).getTime();
      const ageMs = Date.now() - updatedAtMs;
      if (ageMs > maxAgeSeconds * 1000) {
        return null;
      }
    }

    try {
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  }

  public clearCache(): void {
    this.db.run(`DELETE FROM cache;`);
  }

  public close(): void {
    this.db.close();
  }
}
