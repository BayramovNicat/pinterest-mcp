/**
 * Core security utility for masking secrets, access tokens, and sensitive credentials.
 * Pure TypeScript with zero external or runtime dependencies.
 * @module core/security/secret-masker
 */

export class SecretMasker {
	private static readonly KNOWN_SECRETS: Set<string> = new Set();

	/**
	 * Registers a sensitive secret string to be redacted everywhere.
	 * @param secret - Sensitive string (e.g. access token, app secret)
	 */
	public static registerSecret(secret: string | undefined): void {
		if (secret && secret.length >= 6) {
			SecretMasker.KNOWN_SECRETS.add(secret);
		}
	}

	/**
	 * Masks sensitive credentials in an arbitrary string.
	 * @param text - Raw input text
	 * @returns Sanitized string with secrets masked
	 */
	public static mask(text: string): string {
		if (!text || typeof text !== "string") {
			return text;
		}

		let sanitized = text;

		// Mask known registered secrets
		for (const secret of SecretMasker.KNOWN_SECRETS) {
			if (sanitized.includes(secret)) {
				sanitized = sanitized.split(secret).join("[REDACTED_SECRET]");
			}
		}

		// Mask Bearer tokens: Bearer <token>
		sanitized = sanitized.replace(
			/Bearer\s+[A-Za-z0-9_\-.]+/gi,
			"Bearer [REDACTED_TOKEN]",
		);

		// Mask Pinterest Access Tokens: pina_...
		sanitized = sanitized.replace(/pina_[A-Za-z0-9_-]+/gi, "pina_[REDACTED]");

		// Mask Basic auth header credentials
		sanitized = sanitized.replace(
			/Basic\s+[A-Za-z0-9+/=]+/gi,
			"Basic [REDACTED_CREDENTIALS]",
		);

		// Mask query parameters in URLs: ?client_secret=... or &access_token=...
		sanitized = sanitized.replace(
			/([?&](?:access_token|client_secret|app_secret|code)=)[^&]+/gi,
			"$1[REDACTED]",
		);

		// Mask JSON keys: "access_token": "..." or "client_secret": "..."
		sanitized = sanitized.replace(
			/("(?:access_token|refresh_token|client_secret|app_secret|secret)":\s*")[^"]+(")/gi,
			"$1[REDACTED]$2",
		);

		return sanitized;
	}

	/**
	 * Deep-masks an object, array, or primitive before logging or serialization.
	 * @param data - Any data structure
	 * @returns Cloned data structure with secrets masked
	 */
	public static maskObject<T>(data: T): T {
		if (data === null || data === undefined) {
			return data;
		}

		if (typeof data === "string") {
			return SecretMasker.mask(data) as T;
		}

		if (Array.isArray(data)) {
			return data.map((item) => SecretMasker.maskObject(item)) as T;
		}

		if (typeof data === "object") {
			const record = data as Record<string, unknown>;
			const cleaned: Record<string, unknown> = {};

			for (const [key, val] of Object.entries(record)) {
				const lowerKey = key.toLowerCase();
				if (
					lowerKey.includes("token") ||
					lowerKey.includes("secret") ||
					lowerKey.includes("password") ||
					lowerKey.includes("authorization")
				) {
					cleaned[key] = "[REDACTED]";
				} else {
					cleaned[key] = SecretMasker.maskObject(val);
				}
			}
			return cleaned as T;
		}

		return data;
	}
}
