/**
 * Port interface for persistent local caching.
 * @module core/interfaces/cache-repository.interface
 */

export interface ICacheRepository {
	/**
	 * Sets a cache key-value pair.
	 * @param key - Cache key
	 * @param value - Any serializable value
	 */
	set<T>(key: string, value: T): void;

	/**
	 * Retrieves a cached value, checking maximum age in seconds if provided.
	 * @param key - Cache key
	 * @param maxAgeSeconds - Optional maximum age in seconds
	 * @returns Deserialized value or null if expired/missing
	 */
	get<T>(key: string, maxAgeSeconds?: number): T | null;

	/**
	 * Deletes a cached entry by key.
	 * @param key - Cache key
	 */
	delete(key: string): void;

	/**
	 * Clears the entire cache.
	 */
	clear(): void;
}
