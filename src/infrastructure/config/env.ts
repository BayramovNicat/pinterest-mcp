/**
 * Validated environment configuration for Pinterest MCP server.
 * @module infrastructure/config/env
 */

import { z } from "zod";

export const EnvSchema = z.object({
  PINTEREST_ACCESS_TOKEN: z.string().optional().default(""),
  PINTEREST_APP_ID: z.string().optional(),
  PINTEREST_APP_SECRET: z.string().optional(),
  PINTEREST_CLIENT_ID: z.string().optional(),
  PINTEREST_CLIENT_SECRET: z.string().optional(),
  PINTEREST_SANDBOX: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  PINTEREST_REDIRECT_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3000)),
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 8080)),
  MCP_TRANSPORT: z.enum(["stdio", "sse", "http"]).optional().default("stdio"),
  DATABASE_PATH: z.string().optional().default("pinterest.db"),
  ALLOWED_MEDIA_DIRS: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let cachedEnv: EnvConfig | null = null;

/**
 * Loads and validates environment variables from process.env using Bun's native runtime loader.
 */
export function getEnvConfig(): EnvConfig {
  if (!cachedEnv) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error("Invalid environment configuration:", parsed.error.format());
      throw new Error(`Environment validation failed: ${parsed.error.message}`);
    }
    cachedEnv = parsed.data;
  }
  return cachedEnv;
}

/**
 * Resets the cached env configuration (useful for testing).
 */
export function resetEnvCache(): void {
  cachedEnv = null;
}
