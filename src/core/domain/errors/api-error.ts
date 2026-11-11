/**
 * Error thrown when the remote Pinterest REST API returns an error response.
 * @module core/domain/errors/api-error
 */

import { DomainError } from "@errors/domain-error.ts";

export class PinterestApiError extends DomainError {
	public readonly code: string = "PINTEREST_API_ERROR";

	constructor(
		message: string,
		public readonly status: number = 500,
		public readonly apiErrorCode: number = 0,
		public readonly details?: unknown,
	) {
		super(
			`Pinterest API Error (${status}${apiErrorCode ? ` / code ${apiErrorCode}` : ""}): ${message}`,
			{
				status,
				apiErrorCode,
				details,
			},
		);
	}
}
