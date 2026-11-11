/**
 * SQLite implementation of the ActionLog repository.
 * @module infrastructure/storage/action-log.repository
 */

import { SecretMasker } from "@core/security/secret-masker.ts";
import type { ActionLog, CreateActionLogDto } from "@entities/action-log.ts";
import type { IActionLogRepository } from "@interfaces/action-log-repository.interface.ts";
import type { DatabaseConnection } from "@storage/database.ts";

export class ActionLogRepository implements IActionLogRepository {
	constructor(private readonly connection: DatabaseConnection) {}

	public logAction(dto: CreateActionLogDto): ActionLog {
		const timestamp = new Date().toISOString();
		const status = dto.status ?? "SUCCESS";
		const targetId = dto.targetId ?? null;

		let detailsStr: string | null = null;
		if (dto.details !== undefined && dto.details !== null) {
			const masked = SecretMasker.maskObject(dto.details);
			detailsStr = typeof masked === "string" ? masked : JSON.stringify(masked);
		}

		const stmt = this.connection.prepare<ActionLog>(`
      INSERT INTO action_logs (timestamp, action, target_id, details, status)
      VALUES ($timestamp, $action, $targetId, $details, $status)
      RETURNING id, timestamp, action, target_id, details, status
    `);

		const result = stmt.get({
			$timestamp: timestamp,
			$action: dto.action,
			$targetId: targetId,
			$details: detailsStr,
			$status: status,
		});

		if (!result) {
			throw new Error("Failed to insert action log entry");
		}

		return result;
	}

	public getRecentActions(limit: number = 20): ActionLog[] {
		const stmt = this.connection.prepare<ActionLog>(`
      SELECT id, timestamp, action, target_id, details, status
      FROM action_logs
      ORDER BY id DESC
      LIMIT $limit
    `);

		return stmt.all({ $limit: limit });
	}

	public getActionsByTarget(targetId: string, limit: number = 20): ActionLog[] {
		const stmt = this.connection.prepare<ActionLog>(`
      SELECT id, timestamp, action, target_id, details, status
      FROM action_logs
      WHERE target_id = $targetId
      ORDER BY id DESC
      LIMIT $limit
    `);

		return stmt.all({ $targetId: targetId, $limit: limit });
	}

	public clearLogs(): void {
		this.connection.run("DELETE FROM action_logs;");
	}
}
