/**
 * Error thrown when Pinterest API authentication fails or credentials are missing/invalid.
 * Extends PinterestApiError for backwards-compatibility and polymorphic catch blocks.
 * @module core/domain/errors/authentication-error
 */

import { PinterestApiError } from "@errors/api-error.ts";

export class PinterestAuthenticationError extends PinterestApiError {
	public override readonly code = "PINTEREST_AUTHENTICATION_ERROR";

	constructor(
		message: string = "Missing Pinterest Access Token. Please configure PINTEREST_ACCESS_TOKEN.",
		context?: Record<string, unknown>,
	) {
		super(message, 401, 0, context);
		this.name = "PinterestAuthenticationError";
	}
}
