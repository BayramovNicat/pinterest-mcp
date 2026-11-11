/**
 * MCP tool registrations for Pinterest Account & Rate Limits.
 * @module presentation/mcp/tools/account.tools
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AccountService } from "@services/account.service.ts";
import { SecretMasker } from "@core/security/secret-masker.ts";

export function registerAccountTools(server: McpServer, accountService: AccountService): void {
  // 1. Get Account
  server.registerTool(
    "pinterest_get_account",
    {
      description: "Get authenticated Pinterest user account profile details (username, pins, followers, website, etc.)",
    },
    async () => {
      try {
        const account = await accountService.getAccount();
        return {
          content: [{ type: "text", text: JSON.stringify(account, null, 2) }],
        };
      } catch (error: unknown) {
        const message = SecretMasker.mask(error instanceof Error ? error.message : String(error));
        return {
          content: [{ type: "text", text: `Error retrieving Pinterest account: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // 2. Get Rate Limit Status
  server.registerTool(
    "pinterest_get_rate_limit_status",
    {
      description: "Check Pinterest API rate limit status, remaining requests, and reset timers",
    },
    async () => {
      const status = accountService.getRateLimitStatus();
      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    }
  );
}
