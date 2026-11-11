/**
 * Backward compatibility wrapper for Account tools registration.
 * @module tools/account
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PinterestClient } from "../infrastructure/pinterest/pinterest-client.ts";
import type { LocalStore } from "../db/database.ts";
import { AccountService } from "../application/services/account.service.ts";
import { registerAccountTools as registerAccountToolsInternal } from "../presentation/mcp/tools/account.tools.ts";

export function registerAccountTools(server: McpServer, client: PinterestClient, db: LocalStore): void {
  const accountService = new AccountService(client, db.actionLogs, db.cache);
  registerAccountToolsInternal(server, accountService);
}
