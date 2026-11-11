/**
 * STDIO transport lifecycle manager for the MCP server.
 * @module infrastructure/server/stdio-transport
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { DatabaseConnection } from "@storage/database.ts";

export interface StdioServerOptions {
	readonly server: McpServer;
	readonly db?: DatabaseConnection;
}

/**
 * Connects the MCP server to STDIO transport and sets up termination signal listeners.
 */
export async function startStdioServer({
	server,
	db,
}: StdioServerOptions): Promise<void> {
	const transport = new StdioServerTransport();

	const shutdown = async () => {
		try {
			await server.close();
			db?.close();
		} catch {
			// Ignore shutdown errors
		} finally {
			process.exit(0);
		}
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	await server.connect(transport);
	console.error("📌 Pinterest MCP Server running on STDIO");
}
