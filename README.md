# Pinterest MCP Server (Bun Native) 📌

A production-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for **Pinterest**, built specifically for AI agents and automated workflows using **Bun native tools**.

## ⚡ Highlights

- **100% Native Bun Stack**: Built with `bun:sqlite`, `Bun.serve()`, `Bun.file`, and native `fetch` — fast, lightweight, and zero external runtime dependencies.
- **Local Image File Pinning**: Point directly to local files (`image_file_path`) created by generative AI or local tools. Native `Bun.file` handles reading, mime detection, and base64 encoding automatically.
- **Persistent Agent Memory**: Embedded `bun:sqlite` local database automatically tracks audit logs of all agent actions and caches metadata.
- **Dual Transport Support**:
  - **STDIO** (Default): Plug directly into Claude Desktop, Cursor, Antigravity, Windsurf, Zed.
  - **HTTP / SSE**: Standalone server powered by `Bun.serve()` for webhooks and network-accessible agents.
- **Automated OAuth Helper**: Built-in `bun run auth` command runs a local `Bun.serve()` server to complete OAuth 2.0 authorization with Pinterest in seconds.
- **Pinterest SEO & Strategy Engine**: Built-in metadata optimization tool (`pinterest_optimize_pin_metadata`) to craft high-converting titles, descriptions with keywords, and alt text.

---

## 🛠️ MCP Tools

### Account & Rate Limits
- `pinterest_get_account`: Get authenticated user profile (username, followers, pins, website, etc.).
- `pinterest_get_rate_limit_status`: Check remaining Pinterest API calls and rate-limit reset timers.

### Boards & Sections
- `pinterest_list_boards`: List boards with pagination (`bookmark`, `page_size`, `privacy`).
- `pinterest_get_board`: Retrieve detailed information for a specific board ID.
- `pinterest_create_board`: Create a new board (`PUBLIC`, `PROTECTED`, or `SECRET`).
- `pinterest_update_board`: Update board name, description, or privacy settings.
- `pinterest_delete_board`: Delete a board.
- `pinterest_list_board_pins`: List pins belonging to a board.
- `pinterest_list_board_sections`: List sections inside a board.
- `pinterest_create_board_section`: Create a section within a board.
- `pinterest_delete_board_section`: Delete a section within a board.

### Pins
- `pinterest_list_pins`: List recent user pins.
- `pinterest_get_pin`: Retrieve complete details and metrics of a pin by ID.
- `pinterest_create_pin`: Create a new pin from:
  - `image_url`: Any public image URL
  - `image_file_path`: Any local file path on disk (processed with `Bun.file`)
  - `image_base64`: Direct base64 image data
- `pinterest_update_pin`: Update title, description, link, alt text, or board assignment.
- `pinterest_delete_pin`: Delete a pin.
- `pinterest_save_pin`: Save (re-pin) an existing pin to another board.

### Analytics
- `pinterest_get_pin_analytics`: Retrieve impressions, saves, pin clicks, and outbound clicks for a pin over a date range (`YYYY-MM-DD`).
- `pinterest_get_account_analytics`: Retrieve overall account performance metrics over a date range.

### Agent Strategy & SEO
- `pinterest_optimize_pin_metadata`: Generates high-converting title variants, keyword-rich SEO descriptions, alt text, and hashtag sets adhering to Pinterest visual search best practices.

---

## 📚 MCP Resources & Prompts

### Resources
- `pinterest://account`: Live summary of user profile and stats.
- `pinterest://boards`: Cached list of boards.
- `pinterest://activity/recent`: Recent pin and board operations logged in SQLite.

### Prompts
- `create-pin-campaign`: Guides the agent through board discovery, SEO optimization, and publishing.
- `audit-and-organize-boards`: Directs the agent to evaluate account structure, identify empty boards, and propose new niche categories.
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

#### Option A: Quick OAuth Flow (Recommended)
Add your Pinterest App credentials in `.env`:
```env
PINTEREST_APP_ID=your_app_id
PINTEREST_APP_SECRET=your_app_secret
```
Then run the built-in Bun OAuth helper:
```bash
bun run auth
```
This opens a local `Bun.serve()` listener on port 3000, generates your authorization link, captures the callback, and automatically saves `PINTEREST_ACCESS_TOKEN` to your `.env`.

#### Option B: Direct Access Token
If you already have a token from the Pinterest Developer Portal, paste it directly:
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
      "args": ["run", "/path/to/pinterestmcp/src/index.ts"],
      "env": {
        "PINTEREST_ACCESS_TOKEN": "your_pinterest_access_token"
      }
    }
  }
}
```

### Antigravity / Cursor / Windsurf / Zed
Point the MCP server configuration to:
- **Command:** `bun`
- **Arguments:** `["run", "<path-to-workspace>/src/index.ts"]`
- **Environment:** `PINTEREST_ACCESS_TOKEN=<token>`

---

## 🌐 Running in HTTP / SSE Mode

If you want to run the server over HTTP/SSE instead of STDIO:
```bash
bun run server --port 8080
```
- SSE endpoint: `http://localhost:8080/sse`
- Health check: `http://localhost:8080/health`

---

## 🧪 Testing

Run the test suite powered by `bun test`:
```bash
bun test
```
Runs unit tests for the SQLite store, Pinterest API client, and MCP tools in under 200ms.
