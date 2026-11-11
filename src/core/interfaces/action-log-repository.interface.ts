/**
 * Port interface for persisting audit/action logs.
 * @module core/interfaces/action-log-repository.interface
 */

import type { ActionLog, CreateActionLogDto } from "@entities/action-log.ts";

export interface IActionLogRepository {
  /**
   * Persists an action log entry.
   * @param dto - Action log details
   * @returns Created ActionLog record
   */
  logAction(dto: CreateActionLogDto): ActionLog;

  /**
   * Retrieves the most recent action logs.
   * @param limit - Maximum entries to return (default 20)
   */
  getRecentActions(limit?: number): ActionLog[];

  /**
   * Retrieves logs for a specific entity target ID.
   * @param targetId - Target entity identifier
   * @param limit - Maximum entries
   */
  getActionsByTarget(targetId: string, limit?: number): ActionLog[];

  /**
   * Clears all recorded action logs.
   */
  clearLogs(): void;
}
