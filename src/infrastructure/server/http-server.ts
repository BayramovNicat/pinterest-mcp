/**
 * HTTP and SSE transport orchestration using native Bun.serve().
 * Implements graceful shutdown, socket draining, SSE session management, and health checks.
 * @module infrastructure/server/http-server
 */

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  IncomingMessage,
  ServerResponse,
  type OutgoingHttpHeader,
  type OutgoingHttpHeaders,
} from "node:http";
import { Socket } from "node:net";
import type { DatabaseConnection } from "@storage/database.ts";
import type { RateLimitStatus } from "@entities/analytics.ts";

export interface HttpServerOptions {
  readonly server: McpServer;
  readonly port: number;
  readonly db?: DatabaseConnection;
  readonly getRateLimits?: () => RateLimitStatus;
}

export interface StartedHttpServer {
  readonly port: number;
  readonly stop: () => Promise<void>;
}

/**
 * Adapter bridging Bun's Web Standard ReadableStream with Node's ServerResponse
 * required by @modelcontextprotocol/sdk SSEServerTransport.
 */
class BunSseServerResponse extends ServerResponse {
  private readonly closeListeners: Array<() => void> = [];

  constructor(
    private readonly streamController: ReadableStreamDefaultController,
    private readonly responseHeaders: Headers,
    private readonly activeStreams: Set<ReadableStreamDefaultController>
  ) {
    super(new IncomingMessage(new Socket()));
  }

  public override writeHead(
    _statusCode: number,
    statusMessage?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    headers?: OutgoingHttpHeaders | OutgoingHttpHeader[]
  ): this {
    const hdrs = typeof statusMessage === "object" && statusMessage !== null ? statusMessage : headers;
    if (hdrs && !Array.isArray(hdrs)) {
      for (const [key, value] of Object.entries(hdrs)) {
        if (value !== undefined) {
          this.responseHeaders.set(key, String(value));
        }
      }
    }
    return this;
  }

  public override write(chunk: unknown): boolean {
    try {
      const text =
        typeof chunk === "string"
          ? chunk
          : Buffer.from(chunk as Uint8Array).toString("utf-8");
      this.streamController.enqueue(new TextEncoder().encode(text));
    } catch {
      // Stream already closed or cancelled
    }
    return true;
  }

  public override end(): this {
    this.activeStreams.delete(this.streamController);
    for (const listener of this.closeListeners) {
      listener();
    }
    try {
      this.streamController.close();
    } catch {
      // Ignore if already closed
    }
    return this;
  }

  public override on(event: string, listener: (...args: unknown[]) => void): this {
    if (event === "close") {
      this.closeListeners.push(listener as () => void);
    }
    return this;
  }
}

/**
 * Adapter bridging a parsed Bun Request into an IncomingMessage for MCP handlePostMessage.
 */
class BunPostIncomingMessage extends IncomingMessage {
  public body: unknown;

  constructor(req: Request, body: unknown) {
    super(new Socket());
    this.url = req.url;
    this.method = req.method;
    this.headers = Object.fromEntries(req.headers.entries());
    this.body = body;
  }
}

/**
 * No-op ServerResponse used when acknowledging SSE POST messages via Bun Response.
 */
class BunNoopServerResponse extends ServerResponse {
  constructor(req: IncomingMessage) {
    super(req);
  }

  public override writeHead(): this {
    return this;
  }

  public override end(): this {
    return this;
  }
}

export function startHttpServer(options: HttpServerOptions): StartedHttpServer {
  const { server, port, db, getRateLimits } = options;
  const sseTransports = new Map<string, SSEServerTransport>();
  const activeStreams = new Set<ReadableStreamDefaultController>();

  const bunServer = Bun.serve({
    port,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);

      // --- SSE Connection Endpoint ---
      if (url.pathname === "/sse") {
        let streamController!: ReadableStreamDefaultController;
        const stream = new ReadableStream({
          start(controller) {
            streamController = controller;
            activeStreams.add(controller);
          },
          cancel() {
            activeStreams.delete(streamController);
          },
        });

        const headers = new Headers({
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        });

        const bridgeResponse = new BunSseServerResponse(streamController, headers, activeStreams);
        const transport = new SSEServerTransport("/messages", bridgeResponse);

        sseTransports.set(transport.sessionId, transport);

        transport.onclose = () => {
          sseTransports.delete(transport.sessionId);
          activeStreams.delete(streamController);
        };

        await server.connect(transport);
        return new Response(stream, { headers });
      }

      // --- SSE Messages Endpoint ---
      if (url.pathname === "/messages" && req.method === "POST") {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          return new Response(JSON.stringify({ error: "Missing sessionId query parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const transport = sseTransports.get(sessionId);
        if (!transport) {
          return new Response(JSON.stringify({ error: `Session "${sessionId}" not found` }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body: unknown = await req.json();
        const incomingMsg = new BunPostIncomingMessage(req, body);
        const noopResponse = new BunNoopServerResponse(incomingMsg);

        await transport.handlePostMessage(incomingMsg, noopResponse, body);

        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // --- Health Check Endpoint ---
      if (url.pathname === "/health") {
        const rateLimits = getRateLimits ? getRateLimits() : null;
        return new Response(
          JSON.stringify(
            {
              status: "healthy",
              service: "pinterest-mcp",
              version: "1.0.0",
              runtime: `Bun ${Bun.version}`,
              activeSseSessions: sseTransports.size,
              rateLimits,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // --- Root Landing Page ---
      return new Response(
        `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>Pinterest MCP Server</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; text-align: center; background: #fafafa; color: #333; }
              .card { max-width: 600px; margin: 40px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
              h1 { color: #e60023; margin-bottom: 8px; }
              code { background: #f0f0f0; padding: 3px 8px; border-radius: 4px; font-size: 14px; }
              .endpoints { text-align: left; margin: 20px 0; background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>📌 Pinterest MCP Server</h1>
              <p>Model Context Protocol Server built natively on <strong>Bun v${Bun.version}</strong></p>
              <div class="endpoints">
                <p><strong>SSE Endpoint:</strong> <code>http://localhost:${port}/sse</code></p>
                <p><strong>Messages:</strong> <code>http://localhost:${port}/messages</code></p>
                <p><strong>Health Check:</strong> <a href="/health"><code>/health</code></a></p>
              </div>
            </div>
          </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    },
  });

  console.log(`📌 Pinterest MCP Server listening on http://localhost:${port}`);
  console.log(`   SSE: http://localhost:${port}/sse`);
  console.log(`   Health: http://localhost:${port}/health`);

  const stop = async (): Promise<void> => {
    // 1. Close active SSE transports
    for (const transport of sseTransports.values()) {
      try {
        await transport.close();
      } catch {
        // Ignore close errors
      }
    }
    sseTransports.clear();

    // 2. Close active streams
    for (const controller of activeStreams) {
      try {
        controller.close();
      } catch {
        // Ignore close errors
      }
    }
    activeStreams.clear();

    // 3. Close MCP server instance
    try {
      await server.close();
    } catch {
      // Ignore
    }

    // 4. Close database connection
    try {
      db?.close();
    } catch {
      // Ignore
    }

    // 5. Drain and stop Bun server
    bunServer.stop(true);
  };

  const shutdownHandler = async () => {
    await stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);

  return { port, stop };
}
