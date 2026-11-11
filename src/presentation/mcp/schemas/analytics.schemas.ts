/**
 * Zod validation schemas for MCP Analytics tools.
 * @module presentation/mcp/schemas/analytics.schemas
 */

import { z } from "zod";

export const GetPinAnalyticsInputSchema = {
  pin_id: z.string().min(1).describe("The ID of the pin"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("End date in YYYY-MM-DD format"),
  metric_types: z
    .array(z.string())
    .default(["IMPRESSION", "SAVE", "PIN_CLICK", "OUTBOUND_CLICK"])
    .describe("List of metric types (e.g., IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK)"),
  app_types: z.enum(["ALL", "MOBILE", "TABLET", "WEB"]).optional().describe("Device/app filter"),
  split_field: z.enum(["NO_SPLIT", "APP_TYPE"]).optional().describe("Split data by dimension"),
};

export const GetAccountAnalyticsInputSchema = {
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("End date in YYYY-MM-DD format"),
  metric_types: z
    .array(z.string())
    .default(["IMPRESSION", "ENGAGEMENT", "PIN_CLICK", "OUTBOUND_CLICK", "SAVE"])
    .describe("List of metric types (e.g., IMPRESSION, ENGAGEMENT, PIN_CLICK, OUTBOUND_CLICK, SAVE)"),
};
