/**
 * Pinterest MCP Server bootstrap and factory.
 * @module server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PinterestClient } from "./infrastructure/pinterest/pinterest-client.ts";
import { LocalStore } from "./db/database.ts";
import { DatabaseConnection } from "./infrastructure/storage/database.ts";
import { createPinterestMcpServer as createMcpServerInternal } from "./presentation/mcp/server.ts";
import type { IPinterestClient } from "./core/domain/interfaces/pinterest-client.interface.ts";

export interface CreateServerOptions {
  client?: IPinterestClient;
  db?: LocalStore | DatabaseConnection;
  name?: string;
  version?: string;
}

export function createPinterestMcpServer(options: CreateServerOptions = {}) {
  const localStore = options.db instanceof LocalStore ? options.db : undefined;
  const dbConnection =
    options.db instanceof DatabaseConnection
      ? options.db
      : localStore?.databaseConnection ?? new DatabaseConnection();

  const client = options.client ?? new PinterestClient();

  const container = createMcpServerInternal({
    client,
    db: dbConnection,
    name: options.name,
    version: options.version,
  });

  return {
    server: container.server,
    client: container.client,
    db: localStore ?? new LocalStore(dbConnection.rawDb.filename || "pinterest.db"),
    services: container.services,
    repos: container.repos,
  };
}

export { McpServer };
