/**
 * Application service for Account profile, Rate limits, and Performance Analytics.
 * @module application/services/account.service
 */

import type { PinterestAccount } from "@entities/account.ts";
import type { ActionLog } from "@entities/action-log.ts";
import type { RateLimitStatus } from "@entities/analytics.ts";
import type { IActionLogRepository } from "@interfaces/action-log-repository.interface.ts";
import type { ICacheRepository } from "@interfaces/cache-repository.interface.ts";
import type {
	AccountAnalyticsParams,
	IPinterestClient,
	PinAnalyticsParams,
} from "@interfaces/pinterest-client.interface.ts";

export class AccountService {
	constructor(
		private readonly pinterestClient: IPinterestClient,
		private readonly actionLogRepo: IActionLogRepository,
		private readonly cacheRepo?: ICacheRepository,
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
				details: {
					error: error instanceof Error ? error.message : String(error),
				},
				status: "ERROR",
			});
			throw error;
		}
	}

	public getRateLimitStatus(): RateLimitStatus {
		return this.pinterestClient.getRateLimitStatus();
	}

	public getRecentActivity(limit: number = 30): ActionLog[] {
		return this.actionLogRepo.getRecentActions(limit);
	}

	public async getPinAnalytics(
		pinId: string,
		params: PinAnalyticsParams,
	): Promise<Record<string, unknown>> {
		try {
			const analytics = await this.pinterestClient.getPinAnalytics(
				pinId,
				params,
			);
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
				details: {
					error: error instanceof Error ? error.message : String(error),
				},
				status: "ERROR",
			});
			throw error;
		}
	}

	public async getAccountAnalytics(
		params: AccountAnalyticsParams,
	): Promise<Record<string, unknown>> {
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
				details: {
					error: error instanceof Error ? error.message : String(error),
				},
				status: "ERROR",
			});
			throw error;
		}
	}
}
