/**
 * Domain entities for Pinterest metrics, rate limits, and analytics.
 * @module core/domain/entities/analytics
 */

export interface RateLimitStatus {
	readonly limit: number | null;
	readonly remaining: number | null;
	readonly resetSeconds: number | null;
	readonly resetDate: string | null;
	readonly lastUpdated: string;
}

export interface MetricSummary {
	readonly metric: string;
	readonly value: number;
}

export interface PinAnalytics {
	readonly pinId: string;
	readonly startDate: string;
	readonly endDate: string;
	readonly metrics: Readonly<Record<string, unknown>>;
}

export interface AccountAnalytics {
	readonly startDate: string;
	readonly endDate: string;
	readonly metrics: Readonly<Record<string, unknown>>;
}
