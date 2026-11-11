/**
 * MCP tool registration for Pinterest SEO & Visual Metadata Optimization.
 * @module presentation/mcp/tools/seo.tools
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SeoOptimizerService } from "../../../application/services/seo-optimizer.service.ts";
import { OptimizePinMetadataInputSchema } from "../schemas/seo.schemas.ts";

export function registerSeoTools(server: McpServer, seoService: SeoOptimizerService): void {
  server.registerTool(
    "pinterest_optimize_pin_metadata",
    {
      description: "Generate SEO-optimized pin titles, descriptions, hashtags, and alt text tailored for Pinterest's visual search algorithm",
      inputSchema: OptimizePinMetadataInputSchema,
    },
    async ({ topic, target_audience, keywords = [], call_to_action }) => {
      const result = seoService.optimizeMetadata({
        topic,
        targetAudience: target_audience,
        keywords,
        callToAction: call_to_action,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
