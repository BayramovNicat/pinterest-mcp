/**
 * Error thrown when a requested Pinterest entity (board, pin, section, user) is not found.
 * @module core/domain/errors/not-found-error
 */

import { DomainError } from "./domain-error.ts";

export class ResourceNotFoundError extends DomainError {
  public readonly code = "RESOURCE_NOT_FOUND";

  constructor(
    public readonly resourceType: string,
    public readonly resourceId: string,
    message?: string
  ) {
    super(message || `${resourceType} with ID "${resourceId}" was not found`, {
      resourceType,
      resourceId,
    });
  }
}
