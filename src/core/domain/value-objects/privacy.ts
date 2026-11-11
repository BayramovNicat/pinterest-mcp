/**
 * Board privacy levels supported by Pinterest.
 * @module core/domain/value-objects/privacy
 */

export const BOARD_PRIVACY_LEVELS = ["PUBLIC", "PROTECTED", "SECRET"] as const;

export type BoardPrivacy = (typeof BOARD_PRIVACY_LEVELS)[number];

/**
 * Checks if a string is a valid Pinterest BoardPrivacy level.
 */
export function isValidBoardPrivacy(value: string): value is BoardPrivacy {
	return (BOARD_PRIVACY_LEVELS as readonly string[]).includes(value);
}
