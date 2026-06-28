import { z } from "zod";

/** Treat blank env values as unset (common in .env files). */
function optionalEnvString() {
  return z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    });
}

function requiredSecret(name: string) {
  return z.string().min(32, `${name} must be at least 32 characters`);
}

const inngestEnvSchema = z
  .object({
    INNGEST_DEV: z.enum(["0", "1"]).default("1"),
    INNGEST_EVENT_KEY: z.string().min(1, "INNGEST_EVENT_KEY is required").default("local"),
    INNGEST_BASE_URL: z
      .string()
      .optional()
      .transform((value) => value?.trim() || undefined)
      .default("http://127.0.0.1:8288"),
    INNGEST_SIGNING_KEY: optionalEnvString(),
  })
  .superRefine((data, ctx) => {
    if (data.INNGEST_DEV === "0" && !data.INNGEST_SIGNING_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["INNGEST_SIGNING_KEY"],
        message: "INNGEST_SIGNING_KEY is required when INNGEST_DEV=0 (production Inngest)",
      });
    }
  });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "prod"]).default("development"),

    ACCESS_TOKEN_SECRET: requiredSecret("ACCESS_TOKEN_SECRET"),
    REFRESH_TOKEN_SECRET: requiredSecret("REFRESH_TOKEN_SECRET"),
    ACCESS_TOKEN_EXPIRY: z.string().min(1).default("15m"),
    REFRESH_TOKEN_EXPIRY: z.string().min(1).default("30d"),

    BETTER_AUTH_SECRET: requiredSecret("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:8000"),

    GOOGLE_OAUTH_CLIENT_ID: optionalEnvString(),
    GOOGLE_OAUTH_CLIENT_SECRET: optionalEnvString(),
    GOOGLE_OAUTH_REDIRECT_URI: optionalEnvString(),

    GITHUB_CLIENT_ID: optionalEnvString(),
    GITHUB_CLIENT_SECRET: optionalEnvString(),

    GITHUB_APP_ID: z.coerce
      .number()
      .int("GITHUB_APP_ID must be an integer")
      .positive("GITHUB_APP_ID must be positive"),
    GITHUB_APP_SECRET: z.string().min(1, "GITHUB_APP_SECRET is required"),
    GITHUB_WEBHOOK_SECRET: z.string().min(1, "GITHUB_WEBHOOK_SECRET is required"),
    GITHUB_APP_INSTALL_URL: z
      .string()
      .url()
      .default("https://github.com/apps/request-to-release-dev/installations/new"),

    PINECONE_API_KEY: z.string().min(1, "PINECONE_API_KEY is required"),
    PINECONE_INDEX: z.string().min(1, "PINECONE_INDEX is required"),

    OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  })
  .and(inngestEnvSchema);

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    const details = safeParseResult.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables (@repo/services):\n${details}`);
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);
