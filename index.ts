/**
 * Pinterest MCP Server Root Package Export.
 * Exports Domain, Application, Infrastructure, and Presentation layers.
 * @module index
 */

export * from "./src/core/domain/index.ts";
export * from "./src/infrastructure/index.ts";
export * from "./src/application/index.ts";
export {
  type PinPublishingService,
  type BoardManagementService,
  type AccountService,
  type SeoOptimizerService,
} from "./src/application/index.ts";
export {
  registerPinTools,
  registerBoardTools,
  registerAnalyticsTools,
  registerAccountTools,
  registerSeoTools,
  registerResources,
  registerPrompts,
} from "./src/presentation/index.ts";
export {
  createPinterestMcpServer,
  type CreateServerOptions,
  McpServer,
} from "./src/server.ts";
export * from "./src/client/pinterest.ts";
export * from "./src/client/types.ts";
export * from "./src/db/database.ts";
