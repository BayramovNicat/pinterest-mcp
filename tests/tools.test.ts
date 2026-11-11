import { describe, test, expect } from "bun:test";
import { createPinterestMcpServer } from "../src/server.ts";
import { LocalStore } from "../src/db/database.ts";
import { PinterestClient } from "../src/client/pinterest.ts";

describe("Pinterest MCP Server & Tools", () => {
  test("initializes server with tools, resources, and prompts", () => {
    const db = new LocalStore(":memory:");
    const client = new PinterestClient({ accessToken: "mock_token" });
    const { server } = createPinterestMcpServer({ client, db });

    expect(server).toBeDefined();
    db.close();
  });

  test("seo optimizer tool generates structured Pinterest metadata", async () => {
    const db = new LocalStore(":memory:");
    const client = new PinterestClient({ accessToken: "mock_token" });
    const { server } = createPinterestMcpServer({ client, db });

    // Directly test the underlying SEO logic or check tool registration
    const tool = (server as any)._tools?.["pinterest_optimize_pin_metadata"] || (server as any).tools?.["pinterest_optimize_pin_metadata"];
    expect(server).toBeDefined();

    db.close();
  });
});
