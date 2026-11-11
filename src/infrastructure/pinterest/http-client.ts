/**
 * Low-level resilient HTTP client for Pinterest REST API v5.
 * Handles rate limits, automatic retries with exponential backoff & jitter, and secret masking.
 * @module infrastructure/pinterest/http-client
 */

import { SecretMasker } from "@core/security/secret-masker.ts";
import type { RateLimitStatus } from "@entities/analytics.ts";
import { PinterestAuthenticationError } from "@errors/authentication-error.ts";
import { PinterestErrorMapper } from "@pinterest/error-mapper.ts";

export interface HttpClientOptions {
	readonly baseUrl: string;
	readonly getAccessToken: () => string;
	readonly maxRetries?: number;
	readonly baseRetryDelayMs?: number;
	readonly maxRetryDelayMs?: number;
	readonly timeoutMs?: number;
}

export class ResilientHttpClient {
	private readonly baseUrl: string;
	private readonly getAccessToken: () => string;
	private readonly maxRetries: number;
	private readonly baseRetryDelayMs: number;
	private readonly maxRetryDelayMs: number;
	private readonly timeoutMs: number;

	private rateLimitInfo: RateLimitStatus = {
		limit: null,
		remaining: null,
		resetSeconds: null,
		resetDate: null,
		lastUpdated: new Date().toISOString(),
	};

	constructor(options: HttpClientOptions) {
		this.baseUrl = options.baseUrl.replace(/\/+$/, "");
		this.getAccessToken = options.getAccessToken;
		this.maxRetries = options.maxRetries ?? 3;
		this.baseRetryDelayMs = options.baseRetryDelayMs ?? 500;
		this.maxRetryDelayMs = options.maxRetryDelayMs ?? 15000;
		this.timeoutMs = options.timeoutMs ?? 30000;
	}

	/**
	 * Returns a snapshot of the current rate limit status.
	 */
	public getRateLimitStatus(): RateLimitStatus {
		return { ...this.rateLimitInfo };
	}

	/**
	 * Updates internal rate limit tracking based on HTTP response headers.
	 */
	private updateRateLimits(headers: Headers): void {
		const limit = headers.get("x-ratelimit-limit");
		const remaining = headers.get("x-ratelimit-remaining");
		const reset = headers.get("x-ratelimit-reset");

		if (remaining !== null) {
			const resetSec = reset ? parseInt(reset, 10) : null;
			this.rateLimitInfo = {
				limit: limit ? parseInt(limit, 10) : null,
				remaining: parseInt(remaining, 10),
				resetSeconds: resetSec,
				resetDate:
					resetSec !== null
						? new Date(Date.now() + resetSec * 1000).toISOString()
						: null,
				lastUpdated: new Date().toISOString(),
			};
		}
	}

	/**
	 * Calculates exponential backoff delay with full jitter.
	 * delay = min(maxDelay, baseDelay * 2^attempt) * random(0.8, 1.2)
	 */
	private calculateBackoff(attempt: number, retryAfterSec?: number): number {
		if (retryAfterSec !== undefined && retryAfterSec > 0) {
			return Math.min(retryAfterSec * 1000, this.maxRetryDelayMs);
		}
		const exponential = this.baseRetryDelayMs * 2 ** attempt;
		const capped = Math.min(this.maxRetryDelayMs, exponential);
		// Add +/- 20% jitter
		const jitter = 0.8 + Math.random() * 0.4;
		return Math.floor(capped * jitter);
	}

	/**
	 * Executes an HTTP request with automatic retries on transient errors and 429s.
	 * @param endpoint - API path or absolute URL
	 * @param init - Request options
	 * @returns Parsed JSON or empty object for 204
	 */
	public async request<T>(
		endpoint: string,
		init: RequestInit = {},
	): Promise<T> {
		const token = this.getAccessToken();
		if (!token) {
			throw new PinterestAuthenticationError(
				"Missing Pinterest Access Token. Please configure PINTEREST_ACCESS_TOKEN.",
			);
		}

		const fullUrl = endpoint.startsWith("http")
			? endpoint
			: `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

		const headers = new Headers(init.headers || {});
		headers.set("Authorization", `Bearer ${token}`);
		if (
			!headers.has("Content-Type") &&
			init.body &&
			typeof init.body === "string"
		) {
			headers.set("Content-Type", "application/json");
		}

		let attempt = 0;
		while (true) {
			try {
				const response = await fetch(fullUrl, {
					...init,
					headers,
					signal: init.signal ?? AbortSignal.timeout(this.timeoutMs),
				});

				this.updateRateLimits(response.headers);

				// Handle 204 No Content
				if (response.status === 204) {
					return {} as T;
				}

				// Parse response body
				let parsedBody: unknown;
				const contentType = response.headers.get("content-type") || "";
				if (contentType.includes("application/json")) {
					parsedBody = await response.json();
				} else {
					const text = await response.text();
					try {
						parsedBody = JSON.parse(text);
					} catch {
						parsedBody = { message: text };
					}
				}

				if (response.ok) {
					return parsedBody as T;
				}

				// Handle 429 Rate Limit
				if (response.status === 429) {
					const retryAfterHeader = response.headers.get("retry-after");
					const retryAfterSec = retryAfterHeader
						? parseInt(retryAfterHeader, 10)
						: undefined;

					if (attempt < this.maxRetries) {
						const delay = this.calculateBackoff(attempt, retryAfterSec);
						attempt++;
						await new Promise((res) => setTimeout(res, delay));
						continue;
					}

					throw PinterestErrorMapper.map(
						response.status,
						parsedBody,
						retryAfterHeader,
						fullUrl,
					);
				}

				// Handle transient 5xx errors
				if (response.status >= 500 && attempt < this.maxRetries) {
					const delay = this.calculateBackoff(attempt);
					attempt++;
					await new Promise((res) => setTimeout(res, delay));
					continue;
				}

				// Non-retryable error
				throw PinterestErrorMapper.map(
					response.status,
					parsedBody,
					null,
					fullUrl,
				);
			} catch (err: unknown) {
				// If it's already a domain error we threw, rethrow
				if (err instanceof Error && "code" in err) {
					throw err;
				}

				// Retry transient network errors
				if (attempt < this.maxRetries) {
					const delay = this.calculateBackoff(attempt);
					attempt++;
					await new Promise((res) => setTimeout(res, delay));
					continue;
				}

				throw new PinterestAuthenticationError(
					SecretMasker.mask(
						`Network request failed: ${err instanceof Error ? err.message : String(err)}`,
					),
				);
			}
		}
	}
}
