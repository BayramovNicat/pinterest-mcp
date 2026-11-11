import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PinterestApiError } from "@errors/api-error.ts";
import { PinterestClient } from "@pinterest/pinterest-client.ts";

interface InterceptedPinPayload {
	board_id?: string;
	title?: string;
	media_source?: {
		source_type?: string;
		url?: string;
	};
}

describe("PinterestClient", () => {
	const testImagePath = "tests/test_temp_pin.png";

	beforeAll(async () => {
		// 1x1 transparent PNG bytes
		const pngBytes = new Uint8Array([
			137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
			0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84,
			120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69,
			78, 68, 174, 66, 96, 130,
		]);
		await Bun.write(testImagePath, pngBytes);
	});

	afterAll(async () => {
		const file = Bun.file(testImagePath);
		if (await file.exists()) {
			await Bun.$`rm -f ${testImagePath}`;
		}
	});

	test("throws error when access token is missing", async () => {
		const client = new PinterestClient({ accessToken: "" });
		expect(client.getAccount()).rejects.toThrow(PinterestApiError);
	});

	test("prepares media source from local image file path via Bun.file", async () => {
		const client = new PinterestClient({ accessToken: "test_token" });
		const mediaSource = await client.prepareMediaSourceFromPath(testImagePath);

		expect(mediaSource.source_type).toBe("image_base64");
		if (mediaSource.source_type === "image_base64") {
			expect(mediaSource.content_type).toBe("image/png");
			expect(typeof mediaSource.data).toBe("string");
			expect(mediaSource.data.length).toBeGreaterThan(10);
		}
	});

	test("rejects non-existent local image file path", async () => {
		const client = new PinterestClient({ accessToken: "test_token" });
		expect(
			client.prepareMediaSourceFromPath("non_existent_file.jpg"),
		).rejects.toThrow("Local image file not found");
	});

	test("tracks rate limits from headers", async () => {
		const client = new PinterestClient({ accessToken: "mock_token" });
		const initialStatus = client.getRateLimitStatus();
		expect(initialStatus.limit).toBeNull();

		const originalFetch = globalThis.fetch;
		globalThis.fetch = Object.assign(
			async () => {
				const headers = new Headers({
					"Content-Type": "application/json",
					"x-ratelimit-limit": "1000",
					"x-ratelimit-remaining": "980",
					"x-ratelimit-reset": "60",
				});
				return new Response(JSON.stringify({ username: "agent_tester" }), {
					status: 200,
					headers,
				});
			},
			{ preconnect: originalFetch.preconnect },
		);

		try {
			const account = await client.getAccount();
			expect(account.username).toBe("agent_tester");

			const updatedStatus = client.getRateLimitStatus();
			expect(updatedStatus.limit).toBe(1000);
			expect(updatedStatus.remaining).toBe(980);
			expect(updatedStatus.resetSeconds).toBe(60);
			expect(updatedStatus.resetDate).not.toBeNull();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("creates pin payload correctly", async () => {
		const client = new PinterestClient({ accessToken: "mock_token" });

		const originalFetch = globalThis.fetch;
		let interceptedBody: InterceptedPinPayload = {};

		globalThis.fetch = Object.assign(
			async (_url: string | URL | Request, init?: RequestInit) => {
				interceptedBody = JSON.parse(
					(init?.body as string) || "{}",
				) as InterceptedPinPayload;
				return new Response(
					JSON.stringify({
						id: "pin_test_999",
						title: interceptedBody.title,
						board_id: interceptedBody.board_id,
					}),
					{ status: 201, headers: { "Content-Type": "application/json" } },
				);
			},
			{ preconnect: originalFetch.preconnect },
		);

		try {
			const created = await client.createPin({
				boardId: "board_123",
				title: "Test Pin Title",
				description: "Test description",
				mediaSource: {
					source_type: "image_url",
					url: "https://example.com/test.jpg",
				},
			});

			expect(created.id).toBe("pin_test_999");
			expect(interceptedBody.board_id).toBe("board_123");
			expect(interceptedBody.title).toBe("Test Pin Title");
			expect(interceptedBody.media_source?.url).toBe(
				"https://example.com/test.jpg",
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
