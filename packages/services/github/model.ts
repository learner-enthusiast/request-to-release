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
