/**
 * Value object representing a 6-character hex color code.
 * @module core/domain/value-objects/colors
 */

export type HexColor = string & { readonly __brand: unique symbol };

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Validates and constructs a HexColor value object.
 * @param color - Color string, e.g. #FF5733
 * @returns HexColor
 * @throws Error if the color is not a valid 6-char hex code
 */
export function createHexColor(color: string): HexColor {
	if (!HEX_COLOR_REGEX.test(color)) {
		throw new Error(`Invalid hex color: "${color}". Expected format #RRGGBB`);
	}
	return color.toUpperCase() as HexColor;
}

/**
 * Checks if a string is a valid HexColor.
 */
export function isValidHexColor(color: string): color is HexColor {
	return HEX_COLOR_REGEX.test(color);
}
