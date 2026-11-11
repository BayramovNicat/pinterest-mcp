import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PinterestClient } from "../client/pinterest.ts";
import type { LocalStore } from "../db/database.ts";
import type { PinterestMediaSource } from "../client/types.ts";

export function registerPinTools(server: McpServer, client: PinterestClient, db: LocalStore) {
  server.registerTool(
    "pinterest_list_pins",
    {
      description: "List recent pins created by or saved by the authenticated user",
      inputSchema: {
        page_size: z.number().int().min(1).max(100).optional().describe("Number of pins to return (max 100, default 25)"),
        bookmark: z.string().optional().describe("Cursor for pagination"),
        pin_filter: z.enum(["exclude_native", "exclude_repins", "has_been_promoted"]).optional().describe("Filter criteria for pins"),
      },
    },
    async ({ page_size, bookmark, pin_filter }) => {
      try {
        const response = await client.listPins({ pageSize: page_size, bookmark, pinFilter: pin_filter });
        db.logAction("list_pins", null, { count: response.items.length, bookmark: response.bookmark });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      } catch (error: any) {
        db.logAction("list_pins", null, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error listing pins: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_get_pin",
    {
      description: "Get detailed information about a specific pin by its ID",
      inputSchema: {
        pin_id: z.string().describe("The unique identifier of the pin"),
      },
    },
    async ({ pin_id }) => {
      try {
        const pin = await client.getPin(pin_id);
        db.logAction("get_pin", pin_id, { title: pin.title });
        return {
          content: [{ type: "text", text: JSON.stringify(pin, null, 2) }],
        };
      } catch (error: any) {
        db.logAction("get_pin", pin_id, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error retrieving pin ${pin_id}: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_create_pin",
    {
      description: "Create a new pin on a Pinterest board using a web image URL, local image file path, or base64 image data",
      inputSchema: {
        board_id: z.string().describe("The ID of the board to pin to"),
        title: z.string().max(100).optional().describe("Pin title (up to 100 characters)"),
        description: z.string().max(800).optional().describe("Pin description (up to 800 characters)"),
        link: z.string().url().optional().describe("Destination URL when users click the pin"),
        alt_text: z.string().max(500).optional().describe("Accessible alt text describing the image"),
        board_section_id: z.string().optional().describe("Optional board section ID"),
        dominant_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Hex color code e.g. #6E7874"),
        image_url: z.string().url().optional().describe("Public URL of the image to pin"),
        image_file_path: z.string().optional().describe("Local file system path to an image file (e.g. /path/to/image.png) - processed via Bun native file tools"),
        image_base64: z.string().optional().describe("Raw base64-encoded image data"),
        image_content_type: z.enum(["image/jpeg", "image/png", "image/webp"]).optional().describe("MIME type for image_base64 (default image/jpeg)"),
      },
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
        let mediaSource: PinterestMediaSource;

        if (image_file_path) {
          mediaSource = await client.prepareMediaSourceFromPath(image_file_path);
        } else if (image_base64) {
          mediaSource = {
            source_type: "image_base64",
            content_type: image_content_type || "image/jpeg",
            data: image_base64,
          };
        } else if (image_url) {
          mediaSource = {
            source_type: "image_url",
            url: image_url,
          };
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

        const pin = await client.createPin({
          boardId: board_id,
          mediaSource,
          title,
          description,
          link,
          altText: alt_text,
          boardSectionId: board_section_id,
          dominantColor: dominant_color,
        });

        db.logAction("create_pin", pin.id, { board_id, title, link });

        return {
          content: [
            {
              type: "text",
              text: `Successfully created pin "${pin.title || pin.id}"!\n\nPin ID: ${pin.id}\nBoard ID: ${pin.board_id}\n\n${JSON.stringify(pin, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        db.logAction("create_pin", null, { board_id, title, error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error creating pin: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_update_pin",
    {
      description: "Update title, description, link, alt text, or board assignment of an existing pin",
      inputSchema: {
        pin_id: z.string().describe("The ID of the pin to update"),
        title: z.string().max(100).optional().describe("New pin title"),
        description: z.string().max(800).optional().describe("New pin description"),
        link: z.string().url().optional().describe("New destination link"),
        alt_text: z.string().max(500).optional().describe("New accessibility alt text"),
        board_id: z.string().optional().describe("Move pin to a different board ID"),
        board_section_id: z.string().optional().describe("Move pin to a different board section ID"),
      },
    },
    async ({ pin_id, title, description, link, alt_text, board_id, board_section_id }) => {
      try {
        const pin = await client.updatePin(pin_id, {
          title,
          description,
          link,
          altText: alt_text,
          boardId: board_id,
          boardSectionId: board_section_id,
        });
        db.logAction("update_pin", pin_id, { title, link, board_id });
        return {
          content: [
            {
              type: "text",
              text: `Successfully updated pin ${pin_id}!\n\n${JSON.stringify(pin, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        db.logAction("update_pin", pin_id, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error updating pin ${pin_id}: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_delete_pin",
    {
      description: "Delete a pin by its ID",
      inputSchema: {
        pin_id: z.string().describe("The ID of the pin to delete"),
      },
    },
    async ({ pin_id }) => {
      try {
        await client.deletePin(pin_id);
        db.logAction("delete_pin", pin_id, null);
        return {
          content: [{ type: "text", text: `Successfully deleted pin ${pin_id}` }],
        };
      } catch (error: any) {
        db.logAction("delete_pin", pin_id, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error deleting pin ${pin_id}: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_save_pin",
    {
      description: "Save (re-pin) an existing pin to another board",
      inputSchema: {
        pin_id: z.string().describe("The ID of the pin to save"),
        board_id: z.string().describe("The destination board ID"),
        board_section_id: z.string().optional().describe("Optional destination board section ID"),
      },
    },
    async ({ pin_id, board_id, board_section_id }) => {
      try {
        const pin = await client.savePin(pin_id, board_id, board_section_id);
        db.logAction("save_pin", pin.id, { originalPinId: pin_id, board_id });
        return {
          content: [
            {
              type: "text",
              text: `Successfully saved pin ${pin_id} to board ${board_id}!\n\n${JSON.stringify(pin, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        db.logAction("save_pin", pin_id, { board_id, error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error saving pin: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
