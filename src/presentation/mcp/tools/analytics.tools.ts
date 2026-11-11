/**
 * MCP tool registrations for Pinterest Analytics.
 * @module presentation/mcp/tools/analytics.tools
 */

import { SecretMasker } from "@core/security/secret-masker.ts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	GetAccountAnalyticsInputSchema,
	GetPinAnalyticsInputSchema,
} from "@schemas/analytics.schemas.ts";
import type { AccountService } from "@services/account.service.ts";

export function registerAnalyticsTools(
	server: McpServer,
	accountService: AccountService,
): void {
	// 1. Pin Analytics
	server.registerTool(
		"pinterest_get_pin_analytics",
		{
			description:
				"Get performance metrics for a specific pin over a date range (impressions, saves, clicks)",
			inputSchema: GetPinAnalyticsInputSchema,
		},
		async ({
			pin_id,
			start_date,
			end_date,
			metric_types,
			app_types,
			split_field,
		}) => {
			try {
				const analytics = await accountService.getPinAnalytics(pin_id, {
					startDate: start_date,
					endDate: end_date,
					metricTypes: metric_types,
					appTypes: app_types,
					splitField: split_field,
				});

				return {
					content: [{ type: "text", text: JSON.stringify(analytics, null, 2) }],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{
							type: "text",
							text: `Error retrieving pin analytics: ${message}`,
						},
					],
					isError: true,
				};
			}
		},
	);

	// 2. Account Analytics
	server.registerTool(
		"pinterest_get_account_analytics",
		{
			description: "Get overall user account analytics over a date range",
			inputSchema: GetAccountAnalyticsInputSchema,
		},
		async ({ start_date, end_date, metric_types }) => {
			try {
				const analytics = await accountService.getAccountAnalytics({
					startDate: start_date,
					endDate: end_date,
					metricTypes: metric_types,
				});

				return {
					content: [{ type: "text", text: JSON.stringify(analytics, null, 2) }],
				};
			} catch (error: unknown) {
				const message = SecretMasker.mask(
					error instanceof Error ? error.message : String(error),
				);
				return {
					content: [
						{
							type: "text",
							text: `Error retrieving account analytics: ${message}`,
						},
					],
					isError: true,
				};
			}
		},
	);
}
