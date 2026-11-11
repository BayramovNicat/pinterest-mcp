#!/usr/bin/env bun
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createPinterestMcpServer } from "./server.ts";

const args = process.argv.slice(2);
const isHttpMode = args.includes("--http") || args.includes("-h") || process.env.MCP_TRANSPORT === "sse";
const portArgIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
const port = portArgIndex !== -1 && args[portArgIndex + 1]
  ? parseInt(args[portArgIndex + 1]!, 10)
  : parseInt(process.env.PORT || "8080", 10);

async function startStdioServer() {
  const { server } = createPinterestMcpServer();
  const transport = new StdioServerTransport();

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });

  await server.connect(transport);
  console.error("📌 Pinterest MCP Server running on STDIO");
}

async function startHttpServer(serverPort: number) {
  const { server } = createPinterestMcpServer();
  const sseTransports = new Map<string, SSEServerTransport>();

  const bunServer = Bun.serve({
    port: serverPort,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/sse") {
        let controller!: ReadableStreamDefaultController;
        const stream = new ReadableStream({
          start(c) {
            controller = c;
          },
          cancel() {
            // Client closed stream
          },
        });

        const headers = new Headers({
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        const fakeRes = {
          writeHead(_status: number, h: Record<string, string>) {
            for (const [k, v] of Object.entries(h)) {
              headers.set(k, v);
            }
          },
          write(chunk: string) {
            controller.enqueue(new TextEncoder().encode(chunk));
          },
          end() {
            try {
              controller.close();
            } catch {}
          },
          on(_event: string, _cb: () => void) {},
        };

        const transport = new SSEServerTransport("/messages", fakeRes as any);
        sseTransports.set(transport.sessionId, transport);

        transport.onclose = () => {
          sseTransports.delete(transport.sessionId);
        };

        await server.connect(transport);

        return new Response(stream, { headers });
      }

      if (url.pathname === "/messages" && req.method === "POST") {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          return new Response("Missing sessionId query parameter", { status: 400 });
        }

        const transport = sseTransports.get(sessionId);
        if (!transport) {
          return new Response(`Session ${sessionId} not found`, { status: 404 });
        }

        const body = await req.json();
        const fakeReq = {
          body,
          headers: Object.fromEntries(req.headers.entries()),
          url: req.url,
          method: req.method,
        };

        const fakeRes = {
          writeHead: () => {},
          end: () => {},
        };

        await transport.handlePostMessage(fakeReq as any, fakeRes as any, body);
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ status: "healthy", service: "pinterest-mcp" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        `<!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #e60023;">Pinterest MCP Server (Bun Native)</h1>
            <p>Connect your MCP Client using:</p>
            <p><strong>SSE Endpoint:</strong> <code>http://localhost:${serverPort}/sse</code></p>
            <p><strong>Messages Endpoint:</strong> <code>http://localhost:${serverPort}/messages</code></p>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    },
  });

  console.log(`📌 Pinterest MCP Server listening on http://localhost:${serverPort}`);
  console.log(`   SSE: http://localhost:${serverPort}/sse`);
  console.log(`   Health: http://localhost:${serverPort}/health`);

  process.on("SIGINT", () => {
    bunServer.stop();
    process.exit(0);
  });
}

if (isHttpMode) {
  startHttpServer(port);
} else {
  startStdioServer().catch((err) => {
    console.error("Fatal error starting Pinterest MCP server:", err);
    process.exit(1);
  });
}
