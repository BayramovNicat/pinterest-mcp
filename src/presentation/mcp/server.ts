/**
 * Presentation MCP Server factory and composition root.
 * Wires Domain, Application, and Presentation layers together.
 * @module presentation/mcp/server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PinterestClient } from "../../infrastructure/pinterest/pinterest-client.ts";
import { DatabaseConnection } from "../../infrastructure/storage/database.ts";
import { ActionLogRepository } from "../../infrastructure/storage/action-log.repository.ts";
import { CacheRepository } from "../../infrastructure/storage/cache.repository.ts";
import { PinPublishingService } from "../../application/services/pin-publishing.service.ts";
import { BoardManagementService } from "../../application/services/board-management.service.ts";
import { AccountService } from "../../application/services/account.service.ts";
import { SeoOptimizerService } from "../../application/services/seo-optimizer.service.ts";
import type { IPinterestClient } from "../../core/domain/interfaces/pinterest-client.interface.ts";
import type { IActionLogRepository } from "../../core/domain/interfaces/action-log-repository.interface.ts";
import type { ICacheRepository } from "../../core/domain/interfaces/cache-repository.interface.ts";

import { registerPinTools } from "./tools/pin.tools.ts";
import { registerBoardTools } from "./tools/board.tools.ts";
import { registerAnalyticsTools } from "./tools/analytics.tools.ts";
import { registerAccountTools } from "./tools/account.tools.ts";
import { registerSeoTools } from "./tools/seo.tools.ts";
import { registerResources } from "./resources/pinterest.resources.ts";
import { registerPrompts } from "./prompts/pinterest.prompts.ts";

export interface CreateServerOptions {
  readonly client?: IPinterestClient;
  readonly db?: DatabaseConnection;
  readonly actionLogRepo?: IActionLogRepository;
  readonly cacheRepo?: ICacheRepository;
  readonly name?: string;
  readonly version?: string;
}

export interface McpServerContainer {
  readonly server: McpServer;
  readonly client: IPinterestClient;
  readonly db: DatabaseConnection;
  readonly repos: {
    readonly actionLog: IActionLogRepository;
    readonly cache: ICacheRepository;
  };
  readonly services: {
    readonly pinPublishing: PinPublishingService;
    readonly boardManagement: BoardManagementService;
    readonly account: AccountService;
    readonly seoOptimizer: SeoOptimizerService;
  };
}

/**
 * Creates and configures the complete Pinterest Model Context Protocol server.
 */
export function createPinterestMcpServer(options: CreateServerOptions = {}): McpServerContainer {
  // 1. Storage & Repositories
  const db = options.db ?? new DatabaseConnection();
  const actionLogRepo = options.actionLogRepo ?? new ActionLogRepository(db);
  const cacheRepo = options.cacheRepo ?? new CacheRepository(db);

  // 2. Client
  const client = options.client ?? new PinterestClient();

  // 3. Application Services
  const pinPublishingService = new PinPublishingService(client, actionLogRepo, cacheRepo);
  const boardManagementService = new BoardManagementService(client, actionLogRepo);
  const accountService = new AccountService(client, actionLogRepo, cacheRepo);
  const seoOptimizerService = new SeoOptimizerService();

  // 4. MCP Server instance
  const server = new McpServer({
    name: options.name ?? "pinterest-mcp",
    version: options.version ?? "1.0.0",
  });

  // 5. Register Tools via server.registerTool
  registerPinTools(server, pinPublishingService);
  registerBoardTools(server, boardManagementService);
  registerAnalyticsTools(server, accountService);
  registerAccountTools(server, accountService);
  registerSeoTools(server, seoOptimizerService);

  // 6. Register Resources & Prompts via server.registerResource / server.registerPrompt
  registerResources(server, client, actionLogRepo);
  registerPrompts(server);

  return {
    server,
    client,
    db,
    repos: {
      actionLog: actionLogRepo,
      cache: cacheRepo,
    },
    services: {
      pinPublishing: pinPublishingService,
      boardManagement: boardManagementService,
      account: accountService,
      seoOptimizer: seoOptimizerService,
    },
  };
}
