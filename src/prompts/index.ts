/**
 * Backward compatibility wrapper for Prompt registrations.
 * @module prompts
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPrompts as registerPromptsInternal } from "../presentation/mcp/prompts/pinterest.prompts.ts";

export function registerPrompts(server: McpServer): void {
  registerPromptsInternal(server);
}
