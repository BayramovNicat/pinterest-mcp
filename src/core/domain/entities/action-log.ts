/**
 * Domain entity representing an audit log entry stored in SQLite.
 * @module core/domain/entities/action-log
 */

export type ActionStatus = "SUCCESS" | "ERROR" | "PENDING";

export interface ActionLog {
	readonly id: number;
	readonly timestamp: string;
	readonly action: string;
	readonly target_id: string | null;
	readonly details: string | null;
	readonly status: ActionStatus | string;
}

export interface CreateActionLogDto {
	readonly action: string;
	readonly targetId?: string | null;
	readonly details?: unknown;
	readonly status?: ActionStatus | string;
}
