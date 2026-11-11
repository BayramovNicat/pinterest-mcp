import { describe, test, expect } from "bun:test";
import { createPinterestMcpServer } from "../src/presentation/mcp/server.ts";
import { DatabaseConnection } from "../src/infrastructure/storage/database.ts";
import { PinterestClient } from "../src/infrastructure/pinterest/pinterest-client.ts";

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

    const registeredTools = (container.server as any)._registeredTools;
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
    const registeredResources = (container.server as any)._registeredResources;
    expect(registeredResources).toBeDefined();
    const resourceKeys = Object.keys(registeredResources);
    expect(resourceKeys).toContain("pinterest://account");
    expect(resourceKeys).toContain("pinterest://boards");
    expect(resourceKeys).toContain("pinterest://activity/recent");

    // Verify prompts
    const registeredPrompts = (container.server as any)._registeredPrompts;
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
    const tool = (container.server as any)._registeredTools["pinterest_optimize_pin_metadata"];
    expect(tool).toBeDefined();

    const output = await tool.handler({
      topic: "Ceramic Pottery",
      target_audience: "Handmade Art Enthusiasts",
      keywords: ["clay mug", "handthrown ceramics"],
      call_to_action: "Shop the batch",
    });

    expect(output.content).toBeDefined();
    expect(output.content[0].type).toBe("text");
    const parsed = JSON.parse(output.content[0].text);
    expect(parsed.topic).toBe("Ceramic Pottery");
    expect(parsed.recommended_titles.length).toBe(3);

    db.close();
  });
});
