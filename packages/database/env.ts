import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine(
    (url) => url.startsWith("postgres://") || url.startsWith("postgresql://"),
    "DATABASE_URL must be a PostgreSQL connection string (postgres:// or postgresql://)",
  );

const envSchema = z.object({
  DATABASE_URL: postgresUrl,
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    const details = safeParseResult.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables (@repo/database):\n${details}`);
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);
