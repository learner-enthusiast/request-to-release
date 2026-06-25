import { randomUUID } from "node:crypto";
import { eq, db } from "@repo/database";

import { githubInstallation } from "@repo/database/schema";
import { errors } from "@repo/errors";

import { getGithubApp } from "../Octokit/index.js";

import type {
  DeleteInstallationInput,
  DeleteInstallationOutput,
  GetInstallationStatusInput,
  GetInstallationStatusOutput,
  GetUserIdByInstallationIdInput,
  GetUserIdByInstallationIdOutput,
  GetUserInstallationIdInput,
  GetUserInstallationIdOutput,
  GithubInstallationStatus,
  SaveInstallationInput,
  SaveInstallationOutput,
} from "./model.ts";
function isGithubRequestError(error: unknown): error is { status: number; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}
function getAccountLogin(
  account: { login?: string; slug?: string } | null | undefined,
): string | null {
  if (!account) return null;
  if ("login" in account && account.login) return account.login;
  if (account.slug) return account.slug;
  return null;
}

function buildDisconnectedStatus(): GithubInstallationStatus {
  return { connected: false, accountLogin: null, installedAt: null };
}

function assertUserId(userId: string): void {
  if (!userId.trim()) {
    errors.validation("userId is required");
  }
}

function assertInstallationId(installationId: number): void {
  if (!Number.isInteger(installationId) || installationId <= 0) {
    errors.validation("installationId must be a positive integer", { installationId });
  }
}

function handleGithubRequestError(error: unknown, installationId: number): never {
  if (isGithubRequestError(error)) {
    if (error.status === 404) {
      return errors.notFound(`GitHub installation ${installationId}`);
    }
    if (error.status === 401 || error.status === 403) {
      return errors.forbidden("GitHub App cannot access this installation");
    }
    return errors.badRequest("GitHub API request failed", {
      installationId,
      status: error.status,
      message: error.message,
    });
  }
  return errors.internal("Failed to communicate with GitHub", error);
}

function handleDbError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("github_installation_installation_id_unique")) {
    return errors.conflict("This GitHub installation is already linked to another account");
  }
  return errors.internal("Database operation failed", error);
}
export default class GithubInstallationService {
  async getInstallationStatus(
    input: GetInstallationStatusInput,
  ): Promise<GetInstallationStatusOutput> {
    assertUserId(input.userId);

    try {
      const [installation] = await db
        .select()
        .from(githubInstallation)
        .where(eq(githubInstallation.userId, input.userId))
        .limit(1);

      if (!installation) {
        return buildDisconnectedStatus();
      }

      return {
        connected: true,
        accountLogin: installation.accountLogin,
        installedAt: installation.createdAt.toISOString(),
      };
    } catch (error) {
      handleDbError(error);
    }
  }

  async saveInstallation(input: SaveInstallationInput): Promise<SaveInstallationOutput> {
    assertUserId(input.userId);
    assertInstallationId(input.installationId);

    const app = await getGithubApp();

    let data;
    try {
      ({ data } = await app.octokit.request("GET /app/installations/{installation_id}", {
        installation_id: input.installationId,
      }));
    } catch (error) {
      handleGithubRequestError(error, input.installationId);
    }

    const accountLogin = getAccountLogin(data.account);
    const accountType = data.target_type ?? null;

    try {
      await db
        .insert(githubInstallation)
        .values({
          id: randomUUID(),
          userId: input.userId,
          installationId: input.installationId,
          accountLogin,
          accountType,
        })
        .onConflictDoUpdate({
          target: githubInstallation.userId,
          set: {
            installationId: input.installationId,
            accountLogin,
            accountType,
          },
        });
    } catch (error) {
      handleDbError(error);
    }

    return { ok: true };
  }

  async deleteInstallation(input: DeleteInstallationInput): Promise<DeleteInstallationOutput> {
    assertUserId(input.userId);

    try {
      const [deleted] = await db
        .delete(githubInstallation)
        .where(eq(githubInstallation.userId, input.userId))
        .returning({ id: githubInstallation.id });

      if (!deleted) {
        errors.notFound("GitHub installation");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AppError") {
        throw error;
      }
      handleDbError(error);
    }

    return { ok: true };
  }

  async getUserIdByInstallationId(
    input: GetUserIdByInstallationIdInput,
  ): Promise<GetUserIdByInstallationIdOutput> {
    assertInstallationId(input.installationId);

    try {
      const [installation] = await db
        .select({ userId: githubInstallation.userId })
        .from(githubInstallation)
        .where(eq(githubInstallation.installationId, input.installationId))
        .limit(1);

      return { userId: installation?.userId ?? null };
    } catch (error) {
      handleDbError(error);
    }
  }

  async getUserInstallationId(
    input: GetUserInstallationIdInput,
  ): Promise<GetUserInstallationIdOutput> {
    assertUserId(input.userId);

    try {
      const [installation] = await db
        .select({ installationId: githubInstallation.installationId })
        .from(githubInstallation)
        .where(eq(githubInstallation.userId, input.userId))
        .limit(1);

      return { installationId: installation?.installationId ?? null };
    } catch (error) {
      handleDbError(error);
    }
  }
}
