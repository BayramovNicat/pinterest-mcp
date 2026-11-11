/**
 * Zod validation schemas for MCP Pin tools.
 * @module presentation/mcp/schemas/pin.schemas
 */

import { z } from "zod";

export const ListPinsInputSchema = {
	page_size: z
		.number()
		.int()
		.min(1)
		.max(100)
		.optional()
		.describe("Number of pins to return (max 100, default 25)"),
	bookmark: z.string().optional().describe("Cursor for pagination"),
	pin_filter: z
		.enum(["exclude_native", "exclude_repins", "has_been_promoted"])
		.optional()
		.describe("Filter criteria for pins"),
};

export const GetPinInputSchema = {
	pin_id: z.string().min(1).describe("The unique identifier of the pin"),
};

export const CreatePinInputSchema = {
	board_id: z.string().min(1).describe("The ID of the board to pin to"),
	title: z
		.string()
		.max(100)
		.optional()
		.describe("Pin title (up to 100 characters)"),
	description: z
		.string()
		.max(800)
		.optional()
		.describe("Pin description (up to 800 characters)"),
	link: z
		.string()
		.url()
		.optional()
		.describe("Destination URL when users click the pin"),
	alt_text: z
		.string()
		.max(500)
		.optional()
		.describe("Accessible alt text describing the image"),
	board_section_id: z.string().optional().describe("Optional board section ID"),
	dominant_color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional()
		.describe("Hex color code e.g. #6E7874"),
	image_url: z
		.string()
		.url()
		.optional()
		.describe("Public URL of the image to pin"),
	image_file_path: z
		.string()
		.optional()
		.describe(
			"Local file system path to an image file (e.g. /path/to/image.png) - processed via Bun native file tools",
		),
	image_base64: z.string().optional().describe("Raw base64-encoded image data"),
	image_content_type: z
		.enum(["image/jpeg", "image/png", "image/webp"])
		.optional()
		.describe("MIME type for image_base64 (default image/jpeg)"),
};

export const UpdatePinInputSchema = {
	pin_id: z.string().min(1).describe("The ID of the pin to update"),
	title: z.string().max(100).optional().describe("New pin title"),
	description: z.string().max(800).optional().describe("New pin description"),
	link: z.string().url().optional().describe("New destination link"),
	alt_text: z
		.string()
		.max(500)
		.optional()
		.describe("New accessibility alt text"),
	board_id: z.string().optional().describe("Move pin to a different board ID"),
	board_section_id: z
		.string()
		.optional()
		.describe("Move pin to a different board section ID"),
};

export const DeletePinInputSchema = {
	pin_id: z.string().min(1).describe("The ID of the pin to delete"),
};

export const SavePinInputSchema = {
	pin_id: z.string().min(1).describe("The ID of the pin to save"),
	board_id: z.string().min(1).describe("The destination board ID"),
	board_section_id: z
		.string()
		.optional()
		.describe("Optional destination board section ID"),
};

export const SearchPinsInputSchema = {
	query: z
		.string()
		.min(1)
		.describe(
			"Keyword or theme to search for on Pinterest (e.g. 'cyberpunk car', 'scandinavian interior', 'coffee aesthetic')",
		),
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.default(10)
		.describe("Number of pins to return (1-50, default 10)"),
};
