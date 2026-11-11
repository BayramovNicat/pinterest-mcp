/**
 * Error thrown when Pinterest API rate limit is exceeded.
 * Extends PinterestApiError for backwards-compatibility and polymorphic catch blocks.
 * @module core/domain/errors/rate-limit-error
 */

import { PinterestApiError } from "@errors/api-error.ts";

export class RateLimitExceededError extends PinterestApiError {
  public override readonly code = "RATE_LIMIT_EXCEEDED";

  constructor(
    message: string = "Pinterest API rate limit exceeded",
    public readonly retryAfterSeconds: number = 60,
    context?: Record<string, unknown>
  ) {
    super(message, 429, 0, { ...context, retryAfterSeconds });
    this.name = "RateLimitExceededError";
  }
}
