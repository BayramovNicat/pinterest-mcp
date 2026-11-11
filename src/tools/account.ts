import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PinterestClient } from "../client/pinterest.ts";
import type { LocalStore } from "../db/database.ts";

export function registerAccountTools(server: McpServer, client: PinterestClient, db: LocalStore) {
  server.registerTool(
    "pinterest_get_account",
    {
      description: "Get authenticated Pinterest user account profile details (username, pins, followers, website, etc.)",
    },
    async () => {
      try {
        const account = await client.getAccount();
        db.logAction("get_account", account.id, { username: account.username });
        db.setCache("account_info", account);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(account, null, 2),
            },
          ],
        };
      } catch (error: any) {
        db.logAction("get_account", null, { error: error.message }, "ERROR");
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving Pinterest account: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_get_rate_limit_status",
    {
      description: "Check Pinterest API rate limit status, remaining requests, and reset timers",
    },
    async () => {
      const status = client.getRateLimitStatus();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }
  );
}
