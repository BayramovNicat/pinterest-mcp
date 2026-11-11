import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { SecretMasker } from "@core/security/secret-masker.ts";
import { PathTraversalSecurityError } from "@errors/security-error.ts";
import { ValidationError } from "@errors/validation-error.ts";
import { PathSanitizer } from "@infrastructure/security/path-sanitizer.ts";

describe("Security - Path Traversal Protection", () => {
	const allowedDir = resolve(process.cwd(), "tests/media_fixtures");
	const testValidFile = resolve(allowedDir, "sample.png");
	let sanitizer: PathSanitizer;

	beforeAll(async () => {
		sanitizer = new PathSanitizer({ allowedDirectories: [allowedDir] });
		await Bun.write(testValidFile, new Uint8Array([1, 2, 3, 4]));
	});

	afterAll(async () => {
		const file = Bun.file(testValidFile);
		if (await file.exists()) {
			await Bun.$`rm -f ${testValidFile}`;
		}
	});

	test("allows valid files within allowed directory", async () => {
		const resolved = await sanitizer.sanitizeImagePath(testValidFile);
		expect(resolved).toBe(testValidFile);
	});

	test("blocks relative traversal escaping directory boundary", async () => {
		const escapingPath = `${allowedDir}/../../package.json`;
		expect(sanitizer.sanitizeImagePath(escapingPath)).rejects.toThrow(
			PathTraversalSecurityError,
		);
	});

	test("blocks root directory traversal", async () => {
		expect(sanitizer.sanitizeImagePath("/etc/passwd")).rejects.toThrow(
			PathTraversalSecurityError,
		);
	});

	test("blocks null-byte injection", async () => {
		const nullByte = `${testValidFile}\0.jpg`;
		expect(sanitizer.sanitizeImagePath(nullByte)).rejects.toThrow(
			PathTraversalSecurityError,
		);
	});

	test("rejects disallowed extensions (e.g. .exe, .sh, .ts)", async () => {
		const badExt = resolve(allowedDir, "test.ts");
		expect(sanitizer.sanitizeImagePath(badExt)).rejects.toThrow(
			ValidationError,
		);
	});

	test("rejects non-existent files", async () => {
		const missing = resolve(allowedDir, "non_existent.jpg");
		expect(sanitizer.sanitizeImagePath(missing)).rejects.toThrow(
			ValidationError,
		);
	});
});

describe("Security - Secret Masking", () => {
	test("masks Bearer tokens in strings", () => {
		const raw =
			"Request failed: Authorization: Bearer secret_token_xyz123 on endpoint";
		const masked = SecretMasker.mask(raw);
		expect(masked).not.toContain("secret_token_xyz123");
		expect(masked).toContain("Bearer [REDACTED_TOKEN]");
	});

	test("masks Pinterest personal access tokens", () => {
		const raw = "Access token pina_test_secret_123456789 was used";
		const masked = SecretMasker.mask(raw);
		expect(masked).not.toContain("pina_test_secret_123456789");
		expect(masked).toContain("pina_[REDACTED]");
	});

	test("masks custom registered secrets", () => {
		const customSecret = "super_secret_oauth_client_code";
		SecretMasker.registerSecret(customSecret);

		const message = `Failed exchanging secret: ${customSecret} with provider`;
		expect(SecretMasker.mask(message)).toContain("[REDACTED_SECRET]");
		expect(SecretMasker.mask(message)).not.toContain(customSecret);
	});

	test("deep-masks objects and nested records", () => {
		const payload = {
			user: "pin_agent",
			access_token: "sensitive_pina_abc",
			app_secret: "hidden_secret_val",
			meta: {
				authorization: "Bearer 999",
				valid: true,
			},
		};

		const sanitized = SecretMasker.maskObject(payload);
		expect(sanitized.access_token).toBe("[REDACTED]");
		expect(sanitized.app_secret).toBe("[REDACTED]");
		expect(sanitized.meta.authorization).toBe("[REDACTED]");
		expect(sanitized.user).toBe("pin_agent");
	});
});
