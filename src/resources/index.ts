/**
 * Backward compatibility wrapper for Resource registrations.
 * @module resources
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PinterestClient } from "../infrastructure/pinterest/pinterest-client.ts";
import type { LocalStore } from "../db/database.ts";
import { registerResources as registerResourcesInternal } from "../presentation/mcp/resources/pinterest.resources.ts";

export function registerResources(server: McpServer, client: PinterestClient, db: LocalStore): void {
  registerResourcesInternal(server, client, db.actionLogs);
}
