/**
 * Error unmapper transforming Pinterest HTTP error responses into domain errors.
 * @module infrastructure/pinterest/error-mapper
 */

import { DomainError } from "@errors/domain-error.ts";
import { PinterestAuthenticationError } from "@errors/authentication-error.ts";
import { RateLimitExceededError } from "@errors/rate-limit-error.ts";
import { ResourceNotFoundError } from "@errors/not-found-error.ts";
import { ValidationError } from "@errors/validation-error.ts";
import { PinterestApiError } from "@errors/api-error.ts";
import { SecretMasker } from "@core/security/secret-masker.ts";
import type { PinterestApiErrorPayload } from "@pinterest/types.ts";

export class PinterestErrorMapper {
  /**
   * Translates an HTTP status and parsed response body into a strongly typed DomainError.
   * @param status - HTTP status code
   * @param body - Parsed JSON or string body
   * @param retryAfterHeader - Optional Retry-After header value
   * @param url - Request endpoint URL for context
   */
  public static map(
    status: number,
    body: unknown,
    retryAfterHeader?: string | null,
    url?: string
  ): DomainError {
    const errorPayload = typeof body === "object" && body !== null ? (body as PinterestApiErrorPayload) : {};
    const rawMessage = errorPayload.message || (typeof body === "string" ? body : `HTTP request failed with status ${status}`);
    const message = SecretMasker.mask(rawMessage);
    const code = errorPayload.code ?? 0;
    const details = SecretMasker.maskObject(errorPayload.details);

    if (status === 401 || status === 403) {
      return new PinterestAuthenticationError(
        `Pinterest Authentication Error (${status}): ${message}`,
        { status, code, details, url: url ? SecretMasker.mask(url) : undefined }
      );
    }

    if (status === 404) {
      return new ResourceNotFoundError(
        "PinterestResource",
        url ? SecretMasker.mask(url) : "unknown",
        `Requested Pinterest resource was not found (${status}): ${message}`
      );
    }

    if (status === 429) {
      let retryAfter = 60;
      if (retryAfterHeader) {
        const parsed = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsed) && parsed > 0) {
          retryAfter = parsed;
        }
      }
      return new RateLimitExceededError(
        `Pinterest API rate limit exceeded: ${message}`,
        retryAfter,
        { status, code, details }
      );
    }

    if (status === 400 || status === 422) {
      return new ValidationError(
        `Pinterest validation failed (${status}): ${message}`,
        Array.isArray(details)
          ? details.map((d: unknown) => ({ path: "api", message: String(d) }))
          : [{ path: "request", message }]
      );
    }

    return new PinterestApiError(message, status, code, details);
  }
}
