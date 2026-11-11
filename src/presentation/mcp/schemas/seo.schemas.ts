/**
 * Zod validation schemas for MCP SEO tool.
 * @module presentation/mcp/schemas/seo.schemas
 */

import { z } from "zod";

export const OptimizePinMetadataInputSchema = {
  topic: z.string().min(1).describe("The main topic, product, or subject of the pin"),
  target_audience: z.string().optional().describe("Intended audience or demographic"),
  keywords: z.array(z.string()).optional().describe("Key search terms or phrases to incorporate"),
  call_to_action: z.string().optional().describe("Desired action (e.g., 'Read the full guide', 'Shop the look')"),
};
