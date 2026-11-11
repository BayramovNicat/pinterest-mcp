/**
 * MCP prompt registrations for AI agent Pinterest workflows.
 * @module presentation/mcp/prompts/pinterest.prompts
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
	// 1. Create Pin Campaign Prompt
	server.registerPrompt(
		"create-pin-campaign",
		{
			description:
				"Step-by-step workflow for an AI agent to research, optimize, and publish high-converting pins to Pinterest",
			argsSchema: {
				topic: z.string().describe("Topic or product for the campaign"),
				target_board_name: z
					.string()
					.optional()
					.describe("Target board name (or will list boards to pick)"),
				destination_url: z.string().optional().describe("Link destination"),
			},
		},
		({ topic, target_board_name, destination_url }) => ({
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: `You are an expert Pinterest Marketing and SEO AI Agent. Please execute a complete pin creation workflow for topic: "${topic}".

Follow these steps:
1. Call 'pinterest_list_boards' to find an appropriate board matching "${target_board_name || topic}" or create a new board if none fits.
2. Call 'pinterest_optimize_pin_metadata' with topic: "${topic}" to generate high-performing title variants, rich descriptions with search keywords, and accessible alt text.
3. Review available image options (either a public image URL or local file path). Ensure visual adheres to a 2:3 vertical aspect ratio.
4. Call 'pinterest_create_pin' to publish the pin to the selected board${destination_url ? ` with destination link: ${destination_url}` : ""}.
5. Confirm the created Pin ID and summarize the result.`,
					},
				},
			],
		}),
	);

	// 2. Audit and Organize Boards Prompt
	server.registerPrompt(
		"audit-and-organize-boards",
		{
			description:
				"Audit existing Pinterest boards, identify gaps, and recommend board restructuring",
		},
		() => ({
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: `You are a Pinterest Account Strategist.
Please perform a complete audit of the user's Pinterest account:
1. Call 'pinterest_get_account' to inspect follower counts, profile details, and account health.
2. Call 'pinterest_list_boards' to retrieve all boards.
3. Call 'pinterest_audit_boards' to see automated structural diagnostics and recommendations.
4. Analyze board naming conventions, descriptions, privacy levels, and pin distribution.
5. Highlight any empty boards, suggest missing high-volume niche boards, and recommend sections for large boards.`,
					},
				},
			],
		}),
	);

	// 3. Repurpose Content Prompt
	server.registerPrompt(
		"repurpose-content",
		{
			description:
				"Repurpose a blog article, product, or portfolio project into multiple targeted Pinterest pins",
			argsSchema: {
				source_content: z
					.string()
					.describe(
						"Article title, summary, or product description to repurpose",
					),
				destination_link: z.string().describe("Destination URL for all pins"),
			},
		},
		({ source_content, destination_link }) => ({
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: `You are an expert content repurposer for Pinterest.
Take the following source material:
"${source_content}"
Destination URL: ${destination_link}

Your goal:
1. Identify 3 distinct angles or personas (e.g. beginner tips, aesthetic inspiration, problem-solution).
2. For each angle, formulate:
   - Catchy Title (< 100 chars)
   - Keyword-rich Description (< 500 chars)
   - Alt Text (< 500 chars)
   - Visual concept (suggest image or graphic style)
3. Present the 3 pin concepts ready for publication.`,
					},
				},
			],
		}),
	);
}
