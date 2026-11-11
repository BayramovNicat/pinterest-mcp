/**
 * Backward compatibility wrapper for Pin tools registration.
 * @module tools/pins
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PinterestClient } from "../infrastructure/pinterest/pinterest-client.ts";
import type { LocalStore } from "../db/database.ts";
import { PinPublishingService } from "../application/services/pin-publishing.service.ts";
import { registerPinTools as registerPinToolsInternal } from "../presentation/mcp/tools/pin.tools.ts";

export function registerPinTools(server: McpServer, client: PinterestClient, db: LocalStore): void {
  const pinService = new PinPublishingService(client, db.actionLogs, db.cache);
  registerPinToolsInternal(server, pinService);
}
