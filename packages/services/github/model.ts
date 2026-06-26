import { errors } from "@repo/errors";
import { z } from "zod";

// --- shared ---

export const userIdSchema = z.string().trim().min(1, "userId is required");

export const installationIdSchema = z
  .number()
  .int("installationId must be an integer")
  .positive("installationId must be a positive integer");

export const okOutputSchema = z.object({
  ok: z.literal(true),
});

// --- status (output) ---

export const githubInstallationDisconnectedSchema = z.object({
  connected: z.literal(false),
  accountLogin: z.null(),
  installedAt: z.null(),
});

export const githubInstallationConnectedSchema = z.object({
  connected: z.literal(true),
  accountLogin: z.string().nullable(),
  installedAt: z.string(), // ISO string from Date.toISOString()
});

export const githubInstallationStatusSchema = z.discriminatedUnion("connected", [
  githubInstallationDisconnectedSchema,
  githubInstallationConnectedSchema,
]);

// --- inputs ---

export const getInstallationStatusInputSchema = z.object({
  userId: userIdSchema,
});

export const saveInstallationInputSchema = z.object({
  userId: userIdSchema,
  installationId: installationIdSchema,
});

export const deleteInstallationInputSchema = z.object({
  userId: userIdSchema,
});

export const getUserIdByInstallationIdInputSchema = z.object({
  installationId: installationIdSchema,
});

export const getUserInstallationIdInputSchema = z.object({
  userId: userIdSchema,
});

// --- outputs ---

export const getInstallationStatusOutputSchema = githubInstallationStatusSchema;

export const saveInstallationOutputSchema = okOutputSchema;

export const deleteInstallationOutputSchema = okOutputSchema;

export const getUserIdByInstallationIdOutputSchema = z.object({
  userId: userIdSchema.nullable(),
});

export const getUserInstallationIdOutputSchema = z.object({
  installationId: installationIdSchema.nullable(),
});

// --- inferred types ---

export type GithubInstallationStatus = z.infer<typeof githubInstallationStatusSchema>;

export type GetInstallationStatusInput = z.infer<typeof getInstallationStatusInputSchema>;
export type SaveInstallationInput = z.infer<typeof saveInstallationInputSchema>;
export type DeleteInstallationInput = z.infer<typeof deleteInstallationInputSchema>;
export type GetUserIdByInstallationIdInput = z.infer<typeof getUserIdByInstallationIdInputSchema>;
export type GetUserInstallationIdInput = z.infer<typeof getUserInstallationIdInputSchema>;

export type GetInstallationStatusOutput = z.infer<typeof getInstallationStatusOutputSchema>;
export type SaveInstallationOutput = z.infer<typeof saveInstallationOutputSchema>;
export type DeleteInstallationOutput = z.infer<typeof deleteInstallationOutputSchema>;
export type GetUserIdByInstallationIdOutput = z.infer<typeof getUserIdByInstallationIdOutputSchema>;
export type GetUserInstallationIdOutput = z.infer<typeof getUserInstallationIdOutputSchema>;
export const getInstallUrlOutputSchema = z.object({
  url: z.string().url(),
});

export const saveInstallationMutationInputSchema = z.object({
  installationId: installationIdSchema,
});

export const getUserIdByInstallationIdMutationInputSchema = z.object({
  installationId: installationIdSchema,
});
// --- parser ---
export type PullRequestWebhookPayload = {
  action: string;
  installation?: { id: number };
  repository: { full_name: string };
  pull_request: {
    number: number;
    title: string;
    head: { sha: string };
    base: { ref: string };
    user: { login?: string | null } | null;
  };
};

export type GithubWebhookResult = {
  received: true;
  handled?: boolean;
  rateLimited?: boolean;
};
export const syncRepoCodebaseInputSchema = z.object({
  userId: userIdSchema,
  repoFullName: z
    .string()
    .trim()
    .regex(/^[^/]+\/[^/]+$/, "repoFullName must be owner/repo"),
  branch: z.string().trim().min(1, "branch is required"),
});

export const syncRepoCodebaseMutationInputSchema = z.object({
  repoFullName: z
    .string()
    .trim()
    .regex(/^[^/]+\/[^/]+$/, "repoFullName must be owner/repo"),
  branch: z.string().trim().min(1, "branch is required"),
});

export const syncRepoCodebaseOutputSchema = z.object({
  repoSyncId: z.string(),
  status: z.literal("pending"),
});

export type SyncRepoCodebaseInput = z.infer<typeof syncRepoCodebaseInputSchema>;
export type SyncRepoCodebaseOutput = z.infer<typeof syncRepoCodebaseOutputSchema>;

export const codeChunkSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  text: z.string(),
});

export type CodeChunk = z.infer<typeof codeChunkSchema>;
// --- GitHub repos ---

export const githubRepoVisibilitySchema = z.enum(["public", "private"]);

export const githubRepoSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  visibility: githubRepoVisibilitySchema,
  defaultBranch: z.string(),
  updatedAt: z.string(), // ISO
  language: z.string().nullable(),
  stars: z.number().int().nonnegative(),
});

export const getInstallationReposInputSchema = z.object({
  userId: userIdSchema,
  page: z.number().int().positive().default(1),
});

/** tRPC / OpenAPI — userId comes from ctx.user */
export const getInstallationReposQueryInputSchema = z.object({
  page: z.number().int().positive().default(1),
});

export const getInstallationReposOutputSchema = z.object({
  repos: z.array(githubRepoSchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  hasMore: z.boolean(),
});

export type GithubRepo = z.infer<typeof githubRepoSchema>;
export type GetInstallationReposInput = z.infer<typeof getInstallationReposInputSchema>;
export type GetInstallationReposQueryInput = z.infer<typeof getInstallationReposQueryInputSchema>;
export type GetInstallationReposOutput = z.infer<typeof getInstallationReposOutputSchema>;
export type RepoFile = {
  filePath: string;
  content: string;
};

export const repoSyncStatusSchema = z.enum(["pending", "syncing", "synced", "failed"]);

export const getRepoSyncStatusesInputSchema = z.object({
  userId: userIdSchema,
  repoFullNames: z.array(z.string().trim().min(1)).min(1).max(100),
});

export const getRepoSyncStatusesQueryInputSchema = z.object({
  repoFullNames: z.array(z.string().trim().min(1)).min(1).max(100),
});

export const getRepoSyncStatusesOutputSchema = z.record(z.string(), repoSyncStatusSchema);

export type GetRepoSyncStatusesInput = z.infer<typeof getRepoSyncStatusesInputSchema>;
export type GetRepoSyncStatusesQueryInput = z.infer<typeof getRepoSyncStatusesQueryInputSchema>;
export type GetRepoSyncStatusesOutput = z.infer<typeof getRepoSyncStatusesOutputSchema>;
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.validation("Invalid input", error.flatten());
    }
    throw error;
  }
}
