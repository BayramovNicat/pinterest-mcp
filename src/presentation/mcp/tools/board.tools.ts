/**
 * MCP tool registrations for Pinterest Boards and Sections.
 * @module presentation/mcp/tools/board.tools
 */

import { SecretMasker } from "@core/security/secret-masker.ts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	AuditBoardsInputSchema,
	CreateBoardInputSchema,
	CreateBoardSectionInputSchema,
	DeleteBoardInputSchema,
	DeleteBoardSectionInputSchema,
	GetBoardInputSchema,
	ListBoardPinsInputSchema,
	ListBoardSectionsInputSchema,
	ListBoardsInputSchema,
	UpdateBoardInputSchema,
} from "@schemas/board.schemas.ts";
import type { BoardManagementService } from "@services/board-management.service.ts";

export function registerBoardTools(
	server: McpServer,
	boardService: BoardManagementService,
): void {
	// 1. List Boards
	server.registerTool(
		"pinterest_list_boards",
		{
			description:
				"List Pinterest boards for the authenticated user with optional pagination and privacy filtering",
			inputSchema: ListBoardsInputSchema,
		},
		async ({ page_size, bookmark, privacy }) => {
			try {
				const response = await boardService.listBoards({
					pageSize: page_size,
					bookmark,
					privacy,
				});
				return {
					content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [{ type: "text", text: `Error listing boards: ${message}` }],
					isError: true,
				};
			}
		},
	);

	// 2. Get Board
	server.registerTool(
		"pinterest_get_board",
		{
			description: "Get detailed information about a specific board by its ID",
			inputSchema: GetBoardInputSchema,
		},
		async ({ board_id }) => {
			try {
				const board = await boardService.getBoard(board_id);
				return {
					content: [{ type: "text", text: JSON.stringify(board, null, 2) }],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{
							type: "text",
							text: `Error getting board ${board_id}: ${message}`,
						},
					],
					isError: true,
				};
			}
		},
	);

	// 3. Create Board
	server.registerTool(
		"pinterest_create_board",
		{
			description: "Create a new Pinterest board",
			inputSchema: CreateBoardInputSchema,
		},
		async ({ name, description, privacy }) => {
			try {
				const board = await boardService.createBoard({
					name,
					description,
					privacy,
				});
				return {
					content: [
						{
							type: "text",
							text: `Successfully created board "${board.name}" with ID: ${board.id}\n\n${JSON.stringify(board, null, 2)}`,
						},
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [{ type: "text", text: `Error creating board: ${message}` }],
					isError: true,
				};
			}
		},
	);

	// 4. Update Board
	server.registerTool(
		"pinterest_update_board",
		{
			description:
				"Update an existing Pinterest board's name, description, or privacy level",
			inputSchema: UpdateBoardInputSchema,
		},
		async ({ board_id, name, description, privacy }) => {
			try {
				const board = await boardService.updateBoard(board_id, {
					name,
					description,
					privacy,
				});
				return {
					content: [
						{
							type: "text",
							text: `Successfully updated board ${board_id}\n\n${JSON.stringify(board, null, 2)}`,
						},
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [{ type: "text", text: `Error updating board: ${message}` }],
					isError: true,
				};
			}
		},
	);

	// 5. Delete Board
	server.registerTool(
		"pinterest_delete_board",
		{
			description: "Delete a Pinterest board by its ID",
			inputSchema: DeleteBoardInputSchema,
		},
		async ({ board_id }) => {
			try {
				await boardService.deleteBoard(board_id);
				return {
					content: [
						{ type: "text", text: `Successfully deleted board ${board_id}` },
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [{ type: "text", text: `Error deleting board: ${message}` }],
					isError: true,
				};
			}
		},
	);

	// 6. List Board Pins
	server.registerTool(
		"pinterest_list_board_pins",
		{
			description: "List all pins saved on a specific board",
			inputSchema: ListBoardPinsInputSchema,
		},
		async ({ board_id, page_size, bookmark }) => {
			try {
				const response = await boardService.listBoardPins(board_id, {
					pageSize: page_size,
					bookmark,
				});
				return {
					content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{
							type: "text",
							text: `Error listing pins for board ${board_id}: ${message}`,
						},
					],
					isError: true,
				};
			}
		},
	);

	// 7. List Board Sections
	server.registerTool(
		"pinterest_list_board_sections",
		{
			description: "List all sections inside a specific board",
			inputSchema: ListBoardSectionsInputSchema,
		},
		async ({ board_id, page_size, bookmark }) => {
			try {
				const response = await boardService.listBoardSections(board_id, {
					pageSize: page_size,
					bookmark,
				});
				return {
					content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{ type: "text", text: `Error listing board sections: ${message}` },
					],
					isError: true,
				};
			}
		},
	);

	// 8. Create Board Section
	server.registerTool(
		"pinterest_create_board_section",
		{
			description: "Create a new section inside an existing board",
			inputSchema: CreateBoardSectionInputSchema,
		},
		async ({ board_id, name }) => {
			try {
				const section = await boardService.createBoardSection(board_id, name);
				return {
					content: [
						{
							type: "text",
							text: `Created board section "${section.name}" with ID: ${section.id}\n\n${JSON.stringify(section, null, 2)}`,
						},
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{ type: "text", text: `Error creating board section: ${message}` },
					],
					isError: true,
				};
			}
		},
	);

	// 9. Delete Board Section
	server.registerTool(
		"pinterest_delete_board_section",
		{
			description: "Delete a section inside a board",
			inputSchema: DeleteBoardSectionInputSchema,
		},
		async ({ board_id, section_id }) => {
			try {
				await boardService.deleteBoardSection(board_id, section_id);
				return {
					content: [
						{
							type: "text",
							text: `Successfully deleted board section ${section_id}`,
						},
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{ type: "text", text: `Error deleting board section: ${message}` },
					],
					isError: true,
				};
			}
		},
	);

	// 10. Audit Boards
	server.registerTool(
		"pinterest_audit_boards",
		{
			description:
				"Perform an automated audit on all boards, identifying empty boards, large boards, and restructuring advice",
			inputSchema: AuditBoardsInputSchema,
		},
		async () => {
			try {
				const audit = await boardService.auditBoards();
				return {
					content: [{ type: "text", text: JSON.stringify(audit, null, 2) }],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{ type: "text", text: `Error auditing boards: ${message}` },
					],
					isError: true,
				};
			}
		},
	);
}
