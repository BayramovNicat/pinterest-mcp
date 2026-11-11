/**
 * Backward compatibility database wrapper for LocalStore.
 * Delegates to DatabaseConnection, ActionLogRepository, and CacheRepository.
 * @module db/database
 */

import { DatabaseConnection } from "../infrastructure/storage/database.ts";
import { ActionLogRepository } from "../infrastructure/storage/action-log.repository.ts";
import { CacheRepository } from "../infrastructure/storage/cache.repository.ts";
import type { ActionLog } from "../core/domain/entities/action-log.ts";

export type { ActionLog } from "../core/domain/entities/action-log.ts";

export class LocalStore {
  private readonly connection: DatabaseConnection;
  private readonly actionLogRepo: ActionLogRepository;
  private readonly cacheRepo: CacheRepository;

  constructor(dbPath: string = "pinterest.db") {
    this.connection = new DatabaseConnection({ dbPath });
    this.actionLogRepo = new ActionLogRepository(this.connection);
    this.cacheRepo = new CacheRepository(this.connection);
  }

  public get databaseConnection(): DatabaseConnection {
    return this.connection;
  }

  public get actionLogs(): ActionLogRepository {
    return this.actionLogRepo;
  }

  public get cache(): CacheRepository {
    return this.cacheRepo;
  }

  public logAction(
    action: string,
    targetId: string | null = null,
    details: unknown = null,
    status: string = "SUCCESS"
  ): ActionLog {
    return this.actionLogRepo.logAction({
      action,
      targetId,
      details,
      status,
    });
  }

  public getRecentActions(limit: number = 20): ActionLog[] {
    return this.actionLogRepo.getRecentActions(limit);
  }

  public setCache<T>(key: string, value: T): void {
    this.cacheRepo.set(key, value);
  }

  public getCache<T>(key: string, maxAgeSeconds?: number): T | null {
    return this.cacheRepo.get<T>(key, maxAgeSeconds);
  }

  public clearCache(): void {
    this.cacheRepo.clear();
  }

  public close(): void {
    this.connection.close();
  }
}
