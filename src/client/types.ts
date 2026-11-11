/**
 * Backward compatibility type exports for Pinterest client.
 * Re-exports domain entities, value objects, and API DTOs.
 * @module client/types
 */

export * from "../core/domain/entities/account.ts";
export * from "../core/domain/entities/board.ts";
export * from "../core/domain/entities/pin.ts";
export * from "../core/domain/entities/analytics.ts";
export * from "../core/domain/value-objects/privacy.ts";
export * from "../core/domain/value-objects/media-source.ts";
export * from "../infrastructure/pinterest/types.ts";

export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly bookmark?: string | null;
}

export interface PinterestApiErrorResponse {
  readonly code: number;
  readonly message: string;
  readonly details?: unknown;
}
