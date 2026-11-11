import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PinterestClient } from "../client/pinterest.ts";
import type { LocalStore } from "../db/database.ts";

export function registerResources(server: McpServer, client: PinterestClient, db: LocalStore) {
  server.registerResource(
    "account",
    "pinterest://account",
    {
      description: "Live authenticated Pinterest account overview",
      mimeType: "application/json",
    },
    async (uri) => {
      try {
        const account = await client.getAccount();
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(account, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error retrieving account info: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  server.registerResource(
    "boards",
    "pinterest://boards",
    {
      description: "User's Pinterest boards list",
      mimeType: "application/json",
    },
    async (uri) => {
      try {
        const boards = await client.listBoards({ pageSize: 50 });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(boards, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error retrieving boards: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  server.registerResource(
    "recent-activity",
    "pinterest://activity/recent",
    {
      description: "Recent actions and audit trail recorded by the agent in local SQLite",
      mimeType: "application/json",
    },
    async (uri) => {
      const logs = db.getRecentActions(30);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(logs, null, 2),
          },
        ],
      };
    }
  );
}
