# Pinterest MCP Server (Bun Native Enterprise Edition) 📌

An enterprise-grade, production-ready [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for **Pinterest REST API v5**, built specifically for AI agents and automated marketing workflows adhering to **Clean Architecture** and **Domain-Driven Design (DDD)** principles on the **Bun runtime**.

---

## 🏛️ Architecture Overview

The codebase is organized into clean, decoupled layers following Domain-Driven Design (DDD):

```
src/
├── index.ts                        # Executable CLI entry point (STDIO & HTTP/SSE)
├── auth/
│   └── oauth.ts                    # Native Bun.serve() OAuth 2.0 callback & token exchange
├── core/
│   ├── domain/                     # Pure Enterprise Business Rules & Domain Model
│   │   ├── entities/               # Account, Board, Pin, Analytics, ActionLog
│   │   ├── value-objects/          # BoardId, PinId, MediaPayload (Discriminated Unions), HexColor, BoardPrivacy
│   │   └── errors/                 # DomainError hierarchy (Auth, RateLimit, NotFound, Validation, Security)
│   └── interfaces/                 # Ports: IPinterestClient, IActionLogRepository, ICacheRepository
│
├── application/                    # Application Business Rules & Use Cases
│   └── services/                   # PinPublishingService, BoardManagementService, SeoOptimizerService, AccountService
│
├── infrastructure/                 # Concrete Secondary Adapters
│   ├── config/                     # Strict Zod environment validation (env.ts)
│   ├── security/                   # PathSanitizer (CWE-22 Guard), SecretMasker (Credential Redaction)
│   ├── storage/                    # bun:sqlite in WAL mode, prepared statement caching, migrations
│   ├── pinterest/                  # ResilientHttpClient (exponential backoff, jitter, rate-limit tracking)
│   └── server/                     # Transport orchestration (STDIO & Bun.serve SSE/HTTP)
│
└── presentation/mcp/               # Primary MCP Protocol Adapters
    ├── schemas/                    # Strict Zod input validation schemas
    ├── tools/                      # Tool handlers registered via server.registerTool
    ├── resources/                  # Resource handlers registered via server.registerResource
    ├── prompts/                    # Agent prompt workflows registered via server.registerPrompt
    └── server.ts                   # Composition root & dependency injection container
```

---

## ⚡ Highlights

- **Pure Bun Runtime (v1.2+)**: Strictly leverages native Bun APIs (`Bun.serve`, `Bun.file`, `bun:sqlite`, native `fetch`, `bun:test`). Zero unnecessary Node.js polyfills or heavy external runtime dependencies.
- **Latest MCP Specification**: Uses modern, non-deprecated registration methods (`server.registerTool`, `server.registerResource`, `server.registerPrompt`) via `@modelcontextprotocol/sdk`.
- **Discriminated Union Media Payloads**: Strictly typed unions (`imageUrl`, `localFilePath`, `base64Data`) ensuring end-to-end type safety.
- **Path Traversal Protection (CWE-22 Guard)**: Strict boundary enforcement on all local image reads via `Bun.file(path).bytes()` to prevent directory traversal attacks.
- **Rate-Limiting Queuing & Jitter**: Tracks `x-ratelimit-*` headers, handles `429 Too Many Requests` and `Retry-After` headers gracefully with exponential backoff and randomized jitter.
- **Automated Secret Masking**: Sensitive access tokens, app secrets, and Authorization headers are automatically redacted and never leaked into SQLite audit logs or MCP error messages.
- **High-Performance SQLite Storage**: Powered by `bun:sqlite` in WAL mode (`PRAGMA journal_mode = WAL`), cached prepared statements, and transactional versioned migrations.
- **Dual Transport Orchestration**:
  - **STDIO** (Default): Plug directly into Claude Desktop, Cursor, Antigravity, Windsurf, Zed.
  - **HTTP / SSE**: Standalone server powered by `Bun.serve()` with graceful shutdown (`SIGINT`, `SIGTERM`), socket draining (`server.stop(true)`), and detailed `/health` diagnostics.

---

## 🛠️ MCP Tools

### Pins & Publishing
- `pinterest_create_pin`: Publish a pin from a web URL, local file, or base64 payload.
- `pinterest_list_pins`: List recent pins with pagination and filter criteria.
- `pinterest_get_pin`: Retrieve detailed pin metadata and visual specs.
- `pinterest_update_pin`: Update title, description, link, alt text, or board assignment.
- `pinterest_delete_pin`: Delete a pin by ID.
- `pinterest_save_pin`: Save (re-pin) an existing pin to another board.

### Boards & Sections
- `pinterest_list_boards`: List boards with privacy filtering (`PUBLIC`, `PROTECTED`, `SECRET`).
- `pinterest_get_board`: Retrieve detailed information for a specific board ID.
- `pinterest_create_board`: Create a new board with custom privacy settings.
- `pinterest_update_board`: Update board name, description, or privacy level.
- `pinterest_delete_board`: Delete a board.
- `pinterest_list_board_pins`: List pins belonging to a board.
- `pinterest_list_board_sections`: List sections inside a board.
- `pinterest_create_board_section`: Create a section within a board.
- `pinterest_delete_board_section`: Delete a section within a board.
- `pinterest_audit_boards`: Automated diagnostic audit analyzing empty boards, large boards (> 50 pins), and structural taxonomy recommendations.

### Account & Rate Limits
- `pinterest_get_account`: Get authenticated user profile (username, followers, pins, website, etc.).
- `pinterest_get_rate_limit_status`: Inspect remaining calls, limit quota, and reset timestamps.

### Analytics
- `pinterest_get_pin_analytics`: Performance metrics (impressions, saves, clicks) over a date range (`YYYY-MM-DD`).
- `pinterest_get_account_analytics`: High-level account metrics over a date range.

### SEO & Strategy
- `pinterest_optimize_pin_metadata`: Generates high-converting title variants, keyword-rich SEO descriptions, alt text, and hashtag sets adhering to Pinterest visual search best practices.

---

## 📚 MCP Resources & Prompts

### Resources
- `pinterest://account`: Live summary of authenticated user profile.
- `pinterest://boards`: Cached list of user boards.
- `pinterest://activity/recent`: Recent pin and board operations logged in local SQLite.

### Prompts
- `create-pin-campaign`: Step-by-step workflow to research, optimize, and publish high-converting pins.
- `audit-and-organize-boards`: Complete account audit diagnosing board architecture and suggesting missing niche categories.
- `repurpose-content`: Guides the agent to turn a blog post, article, or product link into multiple Pinterest pin concepts.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Credentials
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

#### Option A: Built-in Bun OAuth 2.0 Flow
Add your Pinterest App credentials in `.env`:
```env
PINTEREST_APP_ID=your_app_id
PINTEREST_APP_SECRET=your_app_secret
```
Run the local OAuth helper:
```bash
bun run auth
```
This starts a native `Bun.serve()` listener on port 3000, generates the authorization URL, exchanges the callback code, and securely updates `PINTEREST_ACCESS_TOKEN` in `.env`.

#### Option B: Direct Token
```env
PINTEREST_ACCESS_TOKEN=pina_...
```

---

## 🤖 Connecting to MCP Clients

### Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "pinterest": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/pinterestmcp/src/index.ts"],
      "env": {
        "PINTEREST_ACCESS_TOKEN": "your_pinterest_access_token"
      }
    }
  }
}
```

### Antigravity / Cursor / Windsurf / Zed
- **Command:** `bun`
- **Arguments:** `["run", "<path-to-workspace>/src/index.ts"]`
- **Environment:** `PINTEREST_ACCESS_TOKEN=<token>`

---

## 🌐 Running in HTTP / SSE Mode

```bash
bun run server --port 8080
```
- **SSE Stream:** `http://localhost:8080/sse`
- **Messages:** `http://localhost:8080/messages`
- **Health Check:** `http://localhost:8080/health`

---

## 🧪 Testing & Validation

```bash
# Type check with strict TypeScript compiler
bunx tsc --noEmit

# Run complete test suite (Domain, Security, Storage, HTTP Client, Services, MCP Presentation)
bun test
```
