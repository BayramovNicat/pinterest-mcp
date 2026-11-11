/**
 * Error thrown when a path traversal or security violation is detected.
 * @module core/domain/errors/security-error
 */

import { DomainError } from "@errors/domain-error.ts";

export class PathTraversalSecurityError extends DomainError {
	public readonly code = "PATH_TRAVERSAL_DETECTED";

	constructor(
		public readonly attemptedPath: string,
		message: string = "Access denied: local file path traverses outside allowed directory boundaries",
	) {
		super(message, { attemptedPath });
	}
}
