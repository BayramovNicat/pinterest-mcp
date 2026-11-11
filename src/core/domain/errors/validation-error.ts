/**
 * Error thrown when input validation fails in domain logic or schemas.
 * @module core/domain/errors/validation-error
 */

import { DomainError } from "@errors/domain-error.ts";

export class ValidationError extends DomainError {
	public readonly code = "VALIDATION_ERROR";

	constructor(
		message: string,
		public readonly validationErrors?: ReadonlyArray<{
			path: string;
			message: string;
		}>,
	) {
		super(message, { validationErrors });
	}
}
