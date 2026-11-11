/**
 * MCP tool registrations for Pinterest Pins.
 * @module presentation/mcp/tools/pin.tools
 */

import { SecretMasker } from "@core/security/secret-masker.ts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	CreatePinInputSchema,
	DeletePinInputSchema,
	GetPinInputSchema,
	ListPinsInputSchema,
	SavePinInputSchema,
	UpdatePinInputSchema,
} from "@schemas/pin.schemas.ts";
import type { PinPublishingService } from "@services/pin-publishing.service.ts";
import type { MediaPayload } from "@value-objects/media-source.ts";

export function registerPinTools(
	server: McpServer,
	pinService: PinPublishingService,
): void {
	// 1. List Pins
	server.registerTool(
		"pinterest_list_pins",
		{
			description:
				"List recent pins created by or saved by the authenticated user",
			inputSchema: ListPinsInputSchema,
		},
		async ({ page_size, bookmark, pin_filter }) => {
			try {
				const result = await pinService.listPins({
					pageSize: page_size,
					bookmark,
					pinFilter: pin_filter,
				});
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [{ type: "text", text: `Error listing pins: ${message}` }],
					isError: true,
				};
			}
		},
	);

	// 2. Get Pin
	server.registerTool(
		"pinterest_get_pin",
		{
			description: "Get detailed information about a specific pin by its ID",
			inputSchema: GetPinInputSchema,
		},
		async ({ pin_id }) => {
			try {
				const pin = await pinService.getPin(pin_id);
				return {
					content: [{ type: "text", text: JSON.stringify(pin, null, 2) }],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{
							type: "text",
							text: `Error retrieving pin ${pin_id}: ${message}`,
						},
					],
					isError: true,
				};
			}
		},
	);

	// 3. Create Pin
	server.registerTool(
		"pinterest_create_pin",
		{
			description:
				"Create a new pin on a Pinterest board using a web image URL, local image file path, or base64 image data",
			inputSchema: CreatePinInputSchema,
		},
		async ({
			board_id,
			title,
			description,
			link,
			alt_text,
			board_section_id,
			dominant_color,
			image_url,
			image_file_path,
			image_base64,
			image_content_type,
		}) => {
			try {
				let media: MediaPayload;

				if (image_file_path) {
					media = { kind: "localFilePath", path: image_file_path };
				} else if (image_base64) {
					media = {
						kind: "base64Data",
						data: image_base64,
						contentType: image_content_type ?? "image/jpeg",
					};
				} else if (image_url) {
					media = { kind: "imageUrl", url: image_url };
				} else {
					return {
						content: [
							{
								type: "text",
								text: "Error: You must provide one of `image_url`, `image_file_path`, or `image_base64`.",
							},
						],
						isError: true,
					};
				}

				const pin = await pinService.publishPin({
					boardId: board_id,
					media,
					title,
					description,
					link,
					altText: alt_text,
					boardSectionId: board_section_id,
					dominantColor: dominant_color,
				});

				return {
					content: [
						{
							type: "text",
							text: `Successfully created pin "${pin.title || pin.id}"!\n\nPin ID: ${pin.id}\nBoard ID: ${pin.boardId}\n\n${JSON.stringify(pin, null, 2)}`,
						},
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [{ type: "text", text: `Error creating pin: ${message}` }],
					isError: true,
				};
			}
		},
	);

	// 4. Update Pin
	server.registerTool(
		"pinterest_update_pin",
		{
			description:
				"Update title, description, link, alt text, or board assignment of an existing pin",
			inputSchema: UpdatePinInputSchema,
		},
		async ({
			pin_id,
			title,
			description,
			link,
			alt_text,
			board_id,
			board_section_id,
		}) => {
			try {
				const pin = await pinService.updatePin({
					pinId: pin_id,
					title,
					description,
					link,
					altText: alt_text,
					boardId: board_id,
					boardSectionId: board_section_id,
				});

				return {
					content: [
						{
							type: "text",
							text: `Successfully updated pin ${pin_id}!\n\n${JSON.stringify(pin, null, 2)}`,
						},
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{ type: "text", text: `Error updating pin ${pin_id}: ${message}` },
					],
					isError: true,
				};
			}
		},
	);

	// 5. Delete Pin
	server.registerTool(
		"pinterest_delete_pin",
		{
			description: "Delete a pin by its ID",
			inputSchema: DeletePinInputSchema,
		},
		async ({ pin_id }) => {
			try {
				await pinService.deletePin(pin_id);
				return {
					content: [
						{ type: "text", text: `Successfully deleted pin ${pin_id}` },
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{ type: "text", text: `Error deleting pin ${pin_id}: ${message}` },
					],
					isError: true,
				};
			}
		},
	);

	// 6. Save (re-pin) Pin
	server.registerTool(
		"pinterest_save_pin",
		{
			description: "Save (re-pin) an existing pin to another board",
			inputSchema: SavePinInputSchema,
		},
		async ({ pin_id, board_id, board_section_id }) => {
			try {
				const pin = await pinService.savePin(
					pin_id,
					board_id,
					board_section_id,
				);
				return {
					content: [
						{
							type: "text",
							text: `Successfully saved pin ${pin_id} to board ${board_id}!\n\n${JSON.stringify(pin, null, 2)}`,
						},
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [{ type: "text", text: `Error saving pin: ${message}` }],
					isError: true,
				};
			}
		},
	);
}
