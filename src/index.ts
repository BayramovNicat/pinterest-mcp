#!/usr/bin/env bun
/**
 * Pinterest MCP Server Executable CLI Entry Point.
 * Supports STDIO and native Bun.serve HTTP/SSE transports.
 * @module index
 */

import { createPinterestMcpServer } from "@mcp/server.ts";
import { startStdioServer } from "@server/stdio-transport.ts";
import { startHttpServer } from "@server/http-server.ts";

const args = process.argv.slice(2);
const isHttpMode =
  args.includes("--http") ||
  args.includes("-h") ||
  process.env.MCP_TRANSPORT === "sse" ||
  process.env.MCP_TRANSPORT === "http";

const portArgIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
const port =
  portArgIndex !== -1 && args[portArgIndex + 1]
    ? parseInt(args[portArgIndex + 1]!, 10)
    : parseInt(process.env.PORT || "8080", 10);

async function main(): Promise<void> {
  const container = createPinterestMcpServer();

  if (isHttpMode) {
    startHttpServer({
      server: container.server,
      port,
      db: container.db,
      getRateLimits: () => container.client.getRateLimitStatus(),
    });
  } else {
    await startStdioServer({
      server: container.server,
      db: container.db,
    });
  }
}

main().catch((err: unknown) => {
  console.error("Fatal error starting Pinterest MCP server:", err);
  process.exit(1);
});
