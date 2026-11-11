import { describe, expect, test } from "bun:test";
import { createPinterestMcpServer } from "@mcp/server.ts";
import { PinterestClient } from "@pinterest/pinterest-client.ts";
import { DatabaseConnection } from "@storage/database.ts";

interface RegisteredToolEntry {
	handler: (args: Record<string, unknown>) => Promise<{
		content: Array<{ type: string; text: string }>;
		isError?: boolean;
	}>;
}

interface InternalMcpServerRegistry {
	_registeredTools: Record<string, RegisteredToolEntry>;
	_registeredResources: Record<string, unknown>;
	_registeredPrompts: Record<string, unknown>;
}

describe("Presentation MCP Server Integration", () => {
	test("registers all tools, resources, and prompts with McpServer", () => {
		const db = new DatabaseConnection({ dbPath: ":memory:" });
		const client = new PinterestClient({ accessToken: "mock_token" });

		const container = createPinterestMcpServer({
			client,
			db,
			name: "test-pinterest-mcp",
			version: "2.0.0",
		});

		const registry = container.server as unknown as InternalMcpServerRegistry;
		const registeredTools = registry._registeredTools;
		expect(registeredTools).toBeDefined();

		// Verify key tool names
		const toolNames = Object.keys(registeredTools);
		expect(toolNames).toContain("pinterest_list_pins");
		expect(toolNames).toContain("pinterest_get_pin");
		expect(toolNames).toContain("pinterest_create_pin");
		expect(toolNames).toContain("pinterest_update_pin");
		expect(toolNames).toContain("pinterest_delete_pin");
		expect(toolNames).toContain("pinterest_save_pin");
		expect(toolNames).toContain("pinterest_list_boards");
		expect(toolNames).toContain("pinterest_get_board");
		expect(toolNames).toContain("pinterest_create_board");
		expect(toolNames).toContain("pinterest_update_board");
		expect(toolNames).toContain("pinterest_delete_board");
		expect(toolNames).toContain("pinterest_list_board_pins");
		expect(toolNames).toContain("pinterest_list_board_sections");
		expect(toolNames).toContain("pinterest_create_board_section");
		expect(toolNames).toContain("pinterest_delete_board_section");
		expect(toolNames).toContain("pinterest_audit_boards");
		expect(toolNames).toContain("pinterest_get_pin_analytics");
		expect(toolNames).toContain("pinterest_get_account_analytics");
		expect(toolNames).toContain("pinterest_get_account");
		expect(toolNames).toContain("pinterest_get_rate_limit_status");
		expect(toolNames).toContain("pinterest_optimize_pin_metadata");

		// Verify resources
		const registeredResources = registry._registeredResources;
		expect(registeredResources).toBeDefined();
		const resourceKeys = Object.keys(registeredResources);
		expect(resourceKeys).toContain("pinterest://account");
		expect(resourceKeys).toContain("pinterest://boards");
		expect(resourceKeys).toContain("pinterest://activity/recent");

		// Verify prompts
		const registeredPrompts = registry._registeredPrompts;
		expect(registeredPrompts).toBeDefined();
		const promptNames = Object.keys(registeredPrompts);
		expect(promptNames).toContain("create-pin-campaign");
		expect(promptNames).toContain("audit-and-organize-boards");
		expect(promptNames).toContain("repurpose-content");

		db.close();
	});

	test("executes seo tool through registered handler", async () => {
		const db = new DatabaseConnection({ dbPath: ":memory:" });
		const client = new PinterestClient({ accessToken: "mock_token" });

		const container = createPinterestMcpServer({ client, db });
		const registry = container.server as unknown as InternalMcpServerRegistry;
		const tool = registry._registeredTools.pinterest_optimize_pin_metadata;
		expect(tool).toBeDefined();
		if (!tool) {
			throw new Error("Expected pinterest_optimize_pin_metadata tool");
		}

		const output = await tool.handler({
			topic: "Ceramic Pottery",
			target_audience: "Handmade Art Enthusiasts",
			keywords: ["clay mug", "handthrown ceramics"],
			call_to_action: "Shop the batch",
		});

		expect(output.content).toBeDefined();
		const firstContent = output.content[0];
		expect(firstContent?.type).toBe("text");
		const parsed = JSON.parse(firstContent?.text ?? "{}") as {
			topic: string;
			recommended_titles: string[];
		};
		expect(parsed.topic).toBe("Ceramic Pottery");
		expect(parsed.recommended_titles.length).toBe(3);

		db.close();
	});
});
