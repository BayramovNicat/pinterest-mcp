/**
 * Database connection manager using bun:sqlite with WAL mode and statement caching.
 * @module infrastructure/storage/database
 */

import { Database, Statement } from "bun:sqlite";
import { runMigrations } from "./migrations.ts";

export interface DatabaseOptions {
  readonly dbPath?: string;
  readonly enableWal?: boolean;
}

export class DatabaseConnection {
  private readonly db: Database;
  // Prepared statement cache for high performance
  private readonly statementCache: Map<string, Statement> = new Map();
  private isClosed: boolean = false;

  constructor(options: DatabaseOptions = {}) {
    const dbPath = options.dbPath ?? process.env.DATABASE_PATH ?? "pinterest.db";
    this.db = new Database(dbPath);

    // Apply high-performance pragmas (WAL mode for concurrency, NORMAL synchronous for balance)
    if (options.enableWal !== false && dbPath !== ":memory:") {
      this.db.run("PRAGMA journal_mode = WAL;");
    }
    this.db.run("PRAGMA synchronous = NORMAL;");
    this.db.run("PRAGMA foreign_keys = ON;");

    // Run schema migrations
    runMigrations(this.db);
  }

  /**
   * Returns the underlying raw Database instance.
   */
  public get rawDb(): Database {
    if (this.isClosed) {
      throw new Error("Cannot access closed DatabaseConnection");
    }
    return this.db;
  }

  /**
   * Prepares a SQL query or returns the cached statement.
   * @param sql - SQL query string
   * @returns Bun SQLite Statement
   */
  public prepare<T = unknown>(sql: string): Statement<T> {
    if (this.isClosed) {
      throw new Error("Cannot prepare statement on closed DatabaseConnection");
    }

    let stmt = this.statementCache.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.statementCache.set(sql, stmt);
    }
    return stmt as Statement<T>;
  }

  /**
   * Executes a SQL command directly.
   */
  public run(sql: string): void {
    if (this.isClosed) {
      throw new Error("Cannot run SQL on closed DatabaseConnection");
    }
    this.db.run(sql);
  }

  /**
   * Closes all cached statements and the database connection cleanly.
   */
  public close(): void {
    if (this.isClosed) return;
    this.isClosed = true;

    for (const stmt of this.statementCache.values()) {
      try {
        stmt.finalize();
      } catch {
        // Ignore finalize errors on shutdown
      }
    }
    this.statementCache.clear();

    try {
      this.db.close();
    } catch {
      // Ignore close errors
    }
  }
}
