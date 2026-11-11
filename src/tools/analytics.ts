import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PinterestClient } from "../client/pinterest.ts";
import type { LocalStore } from "../db/database.ts";

export function registerAnalyticsTools(server: McpServer, client: PinterestClient, db: LocalStore) {
  server.registerTool(
    "pinterest_get_pin_analytics",
    {
      description: "Get performance metrics for a specific pin over a date range (impressions, saves, clicks)",
      inputSchema: {
        pin_id: z.string().describe("The ID of the pin"),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Start date in YYYY-MM-DD format"),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("End date in YYYY-MM-DD format"),
        metric_types: z
          .array(z.string())
          .default(["IMPRESSION", "SAVE", "PIN_CLICK", "OUTBOUND_CLICK"])
          .describe("List of metric types (e.g., IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK)"),
        app_types: z.enum(["ALL", "MOBILE", "TABLET", "WEB"]).optional().describe("Device/app filter"),
        split_field: z.enum(["NO_SPLIT", "APP_TYPE"]).optional().describe("Split data by dimension"),
      },
    },
    async ({ pin_id, start_date, end_date, metric_types, app_types, split_field }) => {
      try {
        const analytics = await client.getPinAnalytics(pin_id, {
          startDate: start_date,
          endDate: end_date,
          metricTypes: metric_types,
          appTypes: app_types,
          splitField: split_field,
        });

        db.logAction("get_pin_analytics", pin_id, { start_date, end_date });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analytics, null, 2),
            },
          ],
        };
      } catch (error: any) {
        db.logAction("get_pin_analytics", pin_id, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error retrieving pin analytics: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "pinterest_get_account_analytics",
    {
      description: "Get overall user account analytics over a date range",
      inputSchema: {
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Start date in YYYY-MM-DD format"),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("End date in YYYY-MM-DD format"),
        metric_types: z
          .array(z.string())
          .default(["IMPRESSION", "ENGAGEMENT", "PIN_CLICK", "OUTBOUND_CLICK", "SAVE"])
          .describe("List of metric types (e.g., IMPRESSION, ENGAGEMENT, PIN_CLICK, OUTBOUND_CLICK, SAVE)"),
      },
    },
    async ({ start_date, end_date, metric_types }) => {
      try {
        const analytics = await client.getAccountAnalytics({
          startDate: start_date,
          endDate: end_date,
          metricTypes: metric_types,
        });

        db.logAction("get_account_analytics", null, { start_date, end_date });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analytics, null, 2),
            },
          ],
        };
      } catch (error: any) {
        db.logAction("get_account_analytics", null, { error: error.message }, "ERROR");
        return {
          content: [{ type: "text", text: `Error retrieving account analytics: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
