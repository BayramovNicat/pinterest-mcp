/**
 * MCP resource registrations for Pinterest account, boards, and audit activity.
 * Delegates exclusively to Application Layer services.
 * @module presentation/mcp/resources/pinterest.resources
 */

import { SecretMasker } from "@core/security/secret-masker.ts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AccountService } from "@services/account.service.ts";
import type { BoardManagementService } from "@services/board-management.service.ts";

export function registerResources(
	server: McpServer,
	accountService: AccountService,
	boardService: BoardManagementService,
): void {
	// 1. Account Resource
	server.registerResource(
		"account",
		"pinterest://account",
		{
			description: "Live authenticated Pinterest account overview",
			mimeType: "application/json",
		},
		async (uri) => {
			try {
				const account = await accountService.getAccount();
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "application/json",
							text: JSON.stringify(account, null, 2),
						},
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain",
							text: `Error retrieving account info: ${message}`,
						},
					],
				};
			}
		},
	);

	// 2. Boards Resource
	server.registerResource(
		"boards",
		"pinterest://boards",
		{
			description: "User's Pinterest boards list",
			mimeType: "application/json",
		},
		async (uri) => {
			try {
				const boards = await boardService.listBoards({ pageSize: 50 });
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "application/json",
							text: JSON.stringify(boards, null, 2),
						},
					],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain",
							text: `Error retrieving boards: ${message}`,
						},
					],
				};
			}
		},
	);

	// 3. Recent Activity Resource
	server.registerResource(
		"recent-activity",
		"pinterest://activity/recent",
		{
			description:
				"Recent actions and audit trail recorded by the agent in local SQLite",
			mimeType: "application/json",
		},
		async (uri) => {
			const logs = accountService.getRecentActivity(30);
			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json",
						text: JSON.stringify(logs, null, 2),
					},
				],
			};
		},
	);
}
