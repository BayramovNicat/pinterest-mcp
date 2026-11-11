import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PinterestClient } from "../client/pinterest.ts";
import type { LocalStore } from "../db/database.ts";

export function registerBoardTools(server: McpServer, client: PinterestClient, db: LocalStore) {
  server.registerTool(
    "pinterest_list_boards",
    {
      description: "List Pinterest boards for the authenticated user with optional pagination and privacy filtering",
      inputSchema: {
        page_size: z.number().int().min(1).max(100).optional().describe("Number of boards to return (max 100, default 25)"),
        bookmark: z.string().optional().describe("Cursor for pagination"),
        privacy: z.enum(["PUBLIC", "PROTECTED", "SECRET"]).optional().describe("Filter boards by privacy setting"),
      },
    },
    async ({ page_size, bookmark, privacy }) => {
      try {
        const response = await client.listBoards({ pageSize: page_size, bookmark, privacy });
        db.logAction("list_boards", null, { count: response.items.length, bookmark: response.bookmark });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error: any) {
        db.logAction("list_boards", null, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error listing boards: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_get_board",
    {
      description: "Get detailed information about a specific board by its ID",
      inputSchema: {
        board_id: z.string().describe("The unique identifier of the board"),
      },
    },
    async ({ board_id }) => {
      try {
        const board = await client.getBoard(board_id);
        db.logAction("get_board", board_id, { name: board.name });
        return {
          content: [{ type: "text", text: JSON.stringify(board, null, 2) }],
        };
      } catch (error: any) {
        db.logAction("get_board", board_id, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error getting board ${board_id}: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_create_board",
    {
      description: "Create a new Pinterest board",
      inputSchema: {
        name: z.string().min(1).max(50).describe("Name of the board (up to 50 characters)"),
        description: z.string().max(500).optional().describe("Description of the board (up to 500 characters)"),
        privacy: z.enum(["PUBLIC", "PROTECTED", "SECRET"]).default("PUBLIC").describe("Privacy level: PUBLIC, PROTECTED, or SECRET"),
      },
    },
    async ({ name, description, privacy }) => {
      try {
        const board = await client.createBoard({ name, description, privacy });
        db.logAction("create_board", board.id, { name, privacy });
        return {
          content: [
            {
              type: "text",
              text: `Successfully created board "${board.name}" with ID: ${board.id}\n\n${JSON.stringify(board, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        db.logAction("create_board", null, { name, error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error creating board: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_update_board",
    {
      description: "Update an existing Pinterest board's name, description, or privacy level",
      inputSchema: {
        board_id: z.string().describe("The ID of the board to update"),
        name: z.string().min(1).max(50).optional().describe("New name of the board"),
        description: z.string().max(500).optional().describe("New description of the board"),
        privacy: z.enum(["PUBLIC", "PROTECTED", "SECRET"]).optional().describe("New privacy level"),
      },
    },
    async ({ board_id, name, description, privacy }) => {
      try {
        const board = await client.updateBoard(board_id, { name, description, privacy });
        db.logAction("update_board", board_id, { name, privacy });
        return {
          content: [
            {
              type: "text",
              text: `Successfully updated board ${board_id}\n\n${JSON.stringify(board, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        db.logAction("update_board", board_id, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error updating board: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_delete_board",
    {
      description: "Delete a Pinterest board by its ID",
      inputSchema: {
        board_id: z.string().describe("The ID of the board to delete"),
      },
    },
    async ({ board_id }) => {
      try {
        await client.deleteBoard(board_id);
        db.logAction("delete_board", board_id, null);
        return {
          content: [{ type: "text", text: `Successfully deleted board ${board_id}` }],
        };
      } catch (error: any) {
        db.logAction("delete_board", board_id, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error deleting board: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_list_board_pins",
    {
      description: "List all pins saved on a specific board",
      inputSchema: {
        board_id: z.string().describe("The board ID whose pins to retrieve"),
        page_size: z.number().int().min(1).max(100).optional().describe("Number of pins to return (max 100)"),
        bookmark: z.string().optional().describe("Pagination cursor"),
      },
    },
    async ({ board_id, page_size, bookmark }) => {
      try {
        const response = await client.listBoardPins(board_id, { pageSize: page_size, bookmark });
        db.logAction("list_board_pins", board_id, { count: response.items.length });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      } catch (error: any) {
        db.logAction("list_board_pins", board_id, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error listing pins for board ${board_id}: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_list_board_sections",
    {
      description: "List all sections inside a specific board",
      inputSchema: {
        board_id: z.string().describe("The board ID to inspect sections for"),
        page_size: z.number().int().min(1).max(100).optional().describe("Number of sections to return"),
        bookmark: z.string().optional().describe("Pagination cursor"),
      },
    },
    async ({ board_id, page_size, bookmark }) => {
      try {
        const response = await client.listBoardSections(board_id, { pageSize: page_size, bookmark });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error listing board sections: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_create_board_section",
    {
      description: "Create a new section inside an existing board",
      inputSchema: {
        board_id: z.string().describe("The board ID in which to create the section"),
        name: z.string().min(1).max(180).describe("Section title/name"),
      },
    },
    async ({ board_id, name }) => {
      try {
        const section = await client.createBoardSection(board_id, name);
        db.logAction("create_board_section", board_id, { sectionId: section.id, name });
        return {
          content: [
            {
              type: "text",
              text: `Created board section "${section.name}" with ID: ${section.id}\n\n${JSON.stringify(section, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error creating board section: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_delete_board_section",
    {
      description: "Delete a section inside a board",
      inputSchema: {
        board_id: z.string().describe("The board ID"),
        section_id: z.string().describe("The section ID to delete"),
      },
    },
    async ({ board_id, section_id }) => {
      try {
        await client.deleteBoardSection(board_id, section_id);
        db.logAction("delete_board_section", section_id, { boardId: board_id });
        return {
          content: [{ type: "text", text: `Successfully deleted board section ${section_id}` }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error deleting board section: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
