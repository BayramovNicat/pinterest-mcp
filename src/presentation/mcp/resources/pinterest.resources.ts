/**
 * MCP resource registrations for Pinterest account, boards, and audit activity.
 * @module presentation/mcp/resources/pinterest.resources
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IPinterestClient } from "../../../core/domain/interfaces/pinterest-client.interface.ts";
import type { IActionLogRepository } from "../../../core/domain/interfaces/action-log-repository.interface.ts";
import { SecretMasker } from "../../../infrastructure/security/secret-masker.ts";

export function registerResources(
  server: McpServer,
  client: IPinterestClient,
  actionLogRepo: IActionLogRepository
): void {
  // 1. Account Resource
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
      } catch (error: unknown) {
        const message = SecretMasker.mask(error instanceof Error ? error.message : String(error));
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error retrieving account info: ${message}`,
            },
          ],
        };
      }
    }
  );

  // 2. Boards Resource
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
      } catch (error: unknown) {
        const message = SecretMasker.mask(error instanceof Error ? error.message : String(error));
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error retrieving boards: ${message}`,
            },
          ],
        };
      }
    }
  );

  // 3. Recent Activity Resource
  server.registerResource(
    "recent-activity",
    "pinterest://activity/recent",
    {
      description: "Recent actions and audit trail recorded by the agent in local SQLite",
      mimeType: "application/json",
    },
    async (uri) => {
      const logs = actionLogRepo.getRecentActions(30);
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
