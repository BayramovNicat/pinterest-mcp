/**
 * SQLite implementation of the Cache repository.
 * @module infrastructure/storage/cache.repository
 */

import type { ICacheRepository } from "@interfaces/cache-repository.interface.ts";
import type { DatabaseConnection } from "@storage/database.ts";

interface CacheRow {
	readonly value: string;
	readonly updated_at: string;
}

export class CacheRepository implements ICacheRepository {
	constructor(private readonly connection: DatabaseConnection) {}

	public set<T>(key: string, value: T): void {
		const now = new Date().toISOString();
		const valueStr = JSON.stringify(value);

		const stmt = this.connection.prepare(`
      INSERT INTO cache (key, value, updated_at)
      VALUES ($key, $value, $updated_at)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

		stmt.run({
			$key: key,
			$value: valueStr,
			$updated_at: now,
		});
	}

	public get<T>(key: string, maxAgeSeconds?: number): T | null {
		const stmt = this.connection.prepare<CacheRow>(`
      SELECT value, updated_at FROM cache WHERE key = $key
    `);

		const row = stmt.get({ $key: key });
		if (!row) return null;

		if (maxAgeSeconds !== undefined && maxAgeSeconds > 0) {
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

	public delete(key: string): void {
		const stmt = this.connection.prepare(`
      DELETE FROM cache WHERE key = $key
    `);
		stmt.run({ $key: key });
	}

	public clear(): void {
		this.connection.run("DELETE FROM cache;");
	}
}
