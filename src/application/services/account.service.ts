/**
 * Application service for Account profile, Rate limits, and Performance Analytics.
 * @module application/services/account.service
 */

import type { IPinterestClient } from "../../core/domain/interfaces/pinterest-client.interface.ts";
import type { IActionLogRepository } from "../../core/domain/interfaces/action-log-repository.interface.ts";
import type { ICacheRepository } from "../../core/domain/interfaces/cache-repository.interface.ts";
import type { PinterestAccount } from "../../core/domain/entities/account.ts";
import type { RateLimitStatus } from "../../core/domain/entities/analytics.ts";
import type {
  PinAnalyticsParams,
  AccountAnalyticsParams,
} from "../../core/domain/interfaces/pinterest-client.interface.ts";

export class AccountService {
  constructor(
    private readonly pinterestClient: IPinterestClient,
    private readonly actionLogRepo: IActionLogRepository,
    private readonly cacheRepo?: ICacheRepository
  ) {}

  public async getAccount(): Promise<PinterestAccount> {
    try {
      const account = await this.pinterestClient.getAccount();
      this.actionLogRepo.logAction({
        action: "get_account",
        targetId: account.id,
        details: { username: account.username },
        status: "SUCCESS",
      });
      this.cacheRepo?.set("account_info", account);
      return account;
    } catch (error: unknown) {
      this.actionLogRepo.logAction({
        action: "get_account",
        targetId: null,
        details: { error: error instanceof Error ? error.message : String(error) },
        status: "ERROR",
      });
      throw error;
    }
  }

  public getRateLimitStatus(): RateLimitStatus {
    return this.pinterestClient.getRateLimitStatus();
  }

  public async getPinAnalytics(pinId: string, params: PinAnalyticsParams): Promise<Record<string, unknown>> {
    try {
      const analytics = await this.pinterestClient.getPinAnalytics(pinId, params);
      this.actionLogRepo.logAction({
        action: "get_pin_analytics",
        targetId: pinId,
        details: { startDate: params.startDate, endDate: params.endDate },
        status: "SUCCESS",
      });
      return analytics;
    } catch (error: unknown) {
      this.actionLogRepo.logAction({
        action: "get_pin_analytics",
        targetId: pinId,
        details: { error: error instanceof Error ? error.message : String(error) },
        status: "ERROR",
      });
      throw error;
    }
  }

  public async getAccountAnalytics(params: AccountAnalyticsParams): Promise<Record<string, unknown>> {
    try {
      const analytics = await this.pinterestClient.getAccountAnalytics(params);
      this.actionLogRepo.logAction({
        action: "get_account_analytics",
        targetId: null,
        details: { startDate: params.startDate, endDate: params.endDate },
        status: "SUCCESS",
      });
      return analytics;
    } catch (error: unknown) {
      this.actionLogRepo.logAction({
        action: "get_account_analytics",
        targetId: null,
        details: { error: error instanceof Error ? error.message : String(error) },
        status: "ERROR",
      });
      throw error;
    }
  }
}
