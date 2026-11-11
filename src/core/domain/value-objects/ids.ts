/**
 * Value objects representing strongly typed entity identifiers in the Pinterest domain.
 * @module core/domain/value-objects/ids
 */

/**
 * Branded type representing a Pinterest Board ID.
 */
export type BoardId = string & { readonly __brand: unique symbol };

/**
 * Creates and validates a BoardId.
 * @param id - Raw board ID string
 * @returns Validated BoardId
 * @throws Error if id is empty
 */
export function createBoardId(id: string): BoardId {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new Error("BoardId cannot be empty");
  }
  return trimmed as BoardId;
}

/**
 * Branded type representing a Pinterest Pin ID.
 */
export type PinId = string & { readonly __brand: unique symbol };

/**
 * Creates and validates a PinId.
 * @param id - Raw pin ID string
 * @returns Validated PinId
 * @throws Error if id is empty
 */
export function createPinId(id: string): PinId {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new Error("PinId cannot be empty");
  }
  return trimmed as PinId;
}

/**
 * Branded type representing a Pinterest Board Section ID.
 */
export type BoardSectionId = string & { readonly __brand: unique symbol };

/**
 * Creates and validates a BoardSectionId.
 * @param id - Raw board section ID string
 * @returns Validated BoardSectionId
 * @throws Error if id is empty
 */
export function createBoardSectionId(id: string): BoardSectionId {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new Error("BoardSectionId cannot be empty");
  }
  return trimmed as BoardSectionId;
}
