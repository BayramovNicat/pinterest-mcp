/**
 * Backward compatibility wrapper for SEO tools registration.
 * @module tools/seo
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SeoOptimizerService } from "../application/services/seo-optimizer.service.ts";
import { registerSeoTools as registerSeoToolsInternal } from "../presentation/mcp/tools/seo.tools.ts";

export function registerSeoTools(server: McpServer): void {
  const seoService = new SeoOptimizerService();
  registerSeoToolsInternal(server, seoService);
}
