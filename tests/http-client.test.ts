import { describe, expect, test } from "bun:test";
import { PinterestAuthenticationError } from "@errors/authentication-error.ts";
import { ResourceNotFoundError } from "@errors/not-found-error.ts";
import { RateLimitExceededError } from "@errors/rate-limit-error.ts";
import { ValidationError } from "@errors/validation-error.ts";
import { PinterestErrorMapper } from "@pinterest/error-mapper.ts";
import { ResilientHttpClient } from "@pinterest/http-client.ts";

describe("Infrastructure - ResilientHttpClient & Error Mapper", () => {
	test("PinterestErrorMapper maps 401 and 403 to PinterestAuthenticationError", () => {
		const err401 = PinterestErrorMapper.map(401, { message: "Invalid token" });
		expect(err401).toBeInstanceOf(PinterestAuthenticationError);
		expect(err401.message).toContain("401");

		const err403 = PinterestErrorMapper.map(403, {
			message: "Insufficient permissions",
		});
		expect(err403).toBeInstanceOf(PinterestAuthenticationError);
	});

	test("PinterestErrorMapper maps 404 to ResourceNotFoundError", () => {
		const err404 = PinterestErrorMapper.map(
			404,
			{ message: "Pin not found" },
			null,
			"https://api.pinterest.com/v5/pins/pin_999",
		);
		expect(err404).toBeInstanceOf(ResourceNotFoundError);
	});

	test("PinterestErrorMapper maps 429 to RateLimitExceededError with retryAfter", () => {
		const err429 = PinterestErrorMapper.map(
			429,
			{ message: "Rate limit exceeded" },
			"45",
		);
		expect(err429).toBeInstanceOf(RateLimitExceededError);
		if (err429 instanceof RateLimitExceededError) {
			expect(err429.retryAfterSeconds).toBe(45);
		}
	});

	test("PinterestErrorMapper maps 422 to ValidationError", () => {
		const err422 = PinterestErrorMapper.map(422, {
			message: "Title exceeds 100 characters",
			details: ["title is too long"],
		});
		expect(err422).toBeInstanceOf(ValidationError);
	});

	test("ResilientHttpClient retries on transient 500 errors and succeeds", async () => {
		let callCount = 0;
		const originalFetch = globalThis.fetch;

		globalThis.fetch = Object.assign(
			async () => {
				callCount++;
				if (callCount === 1) {
					return new Response(
						JSON.stringify({ message: "Internal server error" }),
						{
							status: 500,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
				return new Response(JSON.stringify({ status: "ok" }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
			{ preconnect: originalFetch.preconnect },
		);

		try {
			const client = new ResilientHttpClient({
				baseUrl: "https://api.pinterest.com/v5",
				getAccessToken: () => "valid_token",
				maxRetries: 2,
				baseRetryDelayMs: 10,
				maxRetryDelayMs: 50,
			});

			const response = await client.request<{ status: string }>("/test");
			expect(response.status).toBe("ok");
			expect(callCount).toBe(2);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("ResilientHttpClient tracks rate limits accurately", async () => {
		const originalFetch = globalThis.fetch;

		globalThis.fetch = Object.assign(
			async () => {
				return new Response(JSON.stringify({ data: "success" }), {
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"x-ratelimit-limit": "500",
						"x-ratelimit-remaining": "450",
						"x-ratelimit-reset": "30",
					},
				});
			},
			{ preconnect: originalFetch.preconnect },
		);

		try {
			const client = new ResilientHttpClient({
				baseUrl: "https://api.pinterest.com/v5",
				getAccessToken: () => "valid_token",
			});

			await client.request("/user");
			const status = client.getRateLimitStatus();
			expect(status.limit).toBe(500);
			expect(status.remaining).toBe(450);
			expect(status.resetSeconds).toBe(30);
			expect(status.resetDate).not.toBeNull();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
