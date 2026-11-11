/**
 * Backward compatibility wrapper for Analytics tools registration.
 * @module tools/analytics
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PinterestClient } from "../infrastructure/pinterest/pinterest-client.ts";
import type { LocalStore } from "../db/database.ts";
import { AccountService } from "../application/services/account.service.ts";
import { registerAnalyticsTools as registerAnalyticsToolsInternal } from "../presentation/mcp/tools/analytics.tools.ts";

export function registerAnalyticsTools(server: McpServer, client: PinterestClient, db: LocalStore): void {
  const accountService = new AccountService(client, db.actionLogs, db.cache);
  registerAnalyticsToolsInternal(server, accountService);
}
