/**
 * Backward compatibility module for PinterestClient.
 * Re-exports from infrastructure/pinterest/pinterest-client.
 * @module client/pinterest
 */

export { PinterestClient, type PinterestClientConfig } from "../infrastructure/pinterest/pinterest-client.ts";
export { PinterestApiError } from "../core/domain/errors/api-error.ts";
