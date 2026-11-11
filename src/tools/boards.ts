/**
 * Backward compatibility wrapper for Board tools registration.
 * @module tools/boards
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PinterestClient } from "../infrastructure/pinterest/pinterest-client.ts";
import type { LocalStore } from "../db/database.ts";
import { BoardManagementService } from "../application/services/board-management.service.ts";
import { registerBoardTools as registerBoardToolsInternal } from "../presentation/mcp/tools/board.tools.ts";

export function registerBoardTools(server: McpServer, client: PinterestClient, db: LocalStore): void {
  const boardService = new BoardManagementService(client, db.actionLogs);
  registerBoardToolsInternal(server, boardService);
}
