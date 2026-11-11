import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PinterestClient } from "./client/pinterest.ts";
import { LocalStore } from "./db/database.ts";
import { registerAccountTools } from "./tools/account.ts";
import { registerBoardTools } from "./tools/boards.ts";
import { registerPinTools } from "./tools/pins.ts";
import { registerAnalyticsTools } from "./tools/analytics.ts";
import { registerSeoTools } from "./tools/seo.ts";
import { registerResources } from "./resources/index.ts";
import { registerPrompts } from "./prompts/index.ts";

export interface CreateServerOptions {
  client?: PinterestClient;
  db?: LocalStore;
  name?: string;
  version?: string;
}

export function createPinterestMcpServer(options: CreateServerOptions = {}) {
  const client = options.client || new PinterestClient();
  const db = options.db || new LocalStore();

  const server = new McpServer({
    name: options.name || "pinterest-mcp",
    version: options.version || "1.0.0",
  });

  // Register all tools
  registerAccountTools(server, client, db);
  registerBoardTools(server, client, db);
  registerPinTools(server, client, db);
  registerAnalyticsTools(server, client, db);
  registerSeoTools(server);

  // Register resources & prompts
  registerResources(server, client, db);
  registerPrompts(server);

  return { server, client, db };
}
