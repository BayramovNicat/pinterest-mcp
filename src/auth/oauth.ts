/**
 * Pinterest OAuth 2.0 Helper powered by native Bun.serve()
 *
 * Runs a local server on http://localhost:3000/callback to seamlessly
 * complete OAuth authentication and save PINTEREST_ACCESS_TOKEN into .env
 */

const DEFAULT_PORT = 3000;
const SCOPES = [
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
  "user_accounts:read",
].join(",");

async function updateEnvFile(key: string, value: string) {
  const envPath = ".env";
  const file = Bun.file(envPath);
  let content = "";

  if (await file.exists()) {
    content = await file.text();
  }

  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = (content ? content.trimEnd() + "\n" : "") + `${key}=${value}\n`;
  }

  await Bun.write(envPath, content);
}

export async function runOAuthFlow() {
  const clientId = process.env.PINTEREST_APP_ID || process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_APP_SECRET || process.env.PINTEREST_CLIENT_SECRET;
  const port = parseInt(process.env.PINTEREST_REDIRECT_PORT || `${DEFAULT_PORT}`, 10);
  const redirectUri = `http://localhost:${port}/callback`;

  if (!clientId || !clientSecret) {
    console.error("\n❌ Error: Missing Pinterest App credentials.");
    console.error("Please set PINTEREST_APP_ID and PINTEREST_APP_SECRET in your .env file or environment.");
    console.error("\nHow to get them:");
    console.error("1. Go to https://developers.pinterest.com/apps/");
    console.error("2. Create an App and add http://localhost:3000/callback to Redirect URIs");
    console.error("3. Add App ID and App Secret to your .env file:");
    console.error("   PINTEREST_APP_ID=your_app_id");
    console.error("   PINTEREST_APP_SECRET=your_app_secret\n");
    process.exit(1);
  }

  const authUrl = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(SCOPES)}`;

  console.log("\n=======================================================");
  console.log("       Pinterest OAuth 2.0 Setup (Bun Native)         ");
  console.log("=======================================================\n");
  console.log("1. Open the following link in your browser to authorize:");
  console.log(`\n   \x1b[36m${authUrl}\x1b[0m\n`);
  console.log(`2. Waiting for callback at ${redirectUri} ...`);

  let resolveCompletion: () => void;
  const completionPromise = new Promise<void>((resolve) => {
    resolveCompletion = resolve;
  });

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          return new Response(`<h1>Authentication Failed</h1><p>${error}</p>`, {
            headers: { "Content-Type": "text/html" },
            status: 400,
          });
        }

        if (!code) {
          return new Response(`<h1>Missing Authorization Code</h1>`, {
            headers: { "Content-Type": "text/html" },
            status: 400,
          });
        }

        try {
          console.log("\nReceived authorization code. Exchanging for access token...");
          const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

          const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
            method: "POST",
            headers: {
              "Authorization": `Basic ${basicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri,
            }),
          });

          const tokenData = (await tokenRes.json()) as any;

          if (!tokenRes.ok) {
            console.error("Token exchange failed:", tokenData);
            return new Response(`<h1>Token Exchange Failed</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre>`, {
              headers: { "Content-Type": "text/html" },
              status: 400,
            });
          }

          const accessToken = tokenData.access_token;
          const refreshToken = tokenData.refresh_token;

          await updateEnvFile("PINTEREST_ACCESS_TOKEN", accessToken);
          if (refreshToken) {
            await updateEnvFile("PINTEREST_REFRESH_TOKEN", refreshToken);
          }

          console.log("\n✅ Success! PINTEREST_ACCESS_TOKEN saved to .env");
          setTimeout(() => {
            resolveCompletion();
          }, 1000);

          return new Response(
            `<!DOCTYPE html>
            <html>
              <head><title>Pinterest MCP - Authorized</title></head>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #e60023;">Pinterest MCP Authorized!</h1>
                <p>Your access token has been safely stored in <code>.env</code>.</p>
                <p>You can close this tab and return to your terminal.</p>
              </body>
            </html>`,
            {
              headers: { "Content-Type": "text/html" },
            }
          );
        } catch (err: any) {
          console.error("Error exchanging token:", err);
          return new Response(`<h1>Internal Error</h1><p>${err.message}</p>`, {
            headers: { "Content-Type": "text/html" },
            status: 500,
          });
        }
      }

      return new Response("Pinterest OAuth Server running. Please visit the authorization URL.");
    },
  });

  await completionPromise;
  server.stop();
  console.log("OAuth server closed. You are ready to start Pinterest MCP!\n");
}

if (import.meta.main) {
  runOAuthFlow().catch((err) => {
    console.error("OAuth flow error:", err);
    process.exit(1);
  });
}
