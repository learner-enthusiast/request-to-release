import { randomUUID } from "node:crypto";
import { db, eq } from "@repo/database";
import { repoSync } from "@repo/database/schema";
import { errors } from "@repo/errors";
import { logger } from "@repo/logger";

import { getInstallationOctokit } from "../Octokit/index.js";
import GithubInstallationService from "./installation.js";
import type { SyncRepoCodebaseInput, SyncRepoCodebaseOutput } from "./model.js";

function parseRepoFullName(repoFullName: string): { owner: string; repo: string } {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    return errors.validation("repoFullName must be owner/repo", { repoFullName });
  }
  return { owner, repo };
}

export default class GithubRepoSyncService {
  constructor(private readonly installations = new GithubInstallationService()) {}

  async triggerRepoSync(input: SyncRepoCodebaseInput): Promise<SyncRepoCodebaseOutput> {
    const { userId, repoFullName, branch } = input;

    const { installationId } = await this.installations.getUserInstallationId({ userId });

    if (!installationId) {
      return errors.forbidden("GitHub App not connected");
    }

    const { owner, repo } = parseRepoFullName(repoFullName);

    // Verify the installation can access this repo
    const octokit = await getInstallationOctokit(installationId);
    try {
      await octokit.rest.repos.get({ owner, repo });
    } catch {
      return errors.forbidden("Installation cannot access this repository");
    }

    const repoSyncId = randomUUID();

    await db
      .insert(repoSync)
      .values({
        id: repoSyncId,
        installationId,
        repoFullName,
        branch,
        status: "pending",
        chunkCount: 0,
      })
      .onConflictDoUpdate({
        target: repoSync.repoFullName,
        set: {
          installationId,
          branch,
          status: "pending",
          chunkCount: 0,
          syncedAt: null,
        },
      });

    // TODO: enqueue background job (inngest / queue) to fetch + chunk repo files
    logger.info("Repo sync triggered", { userId, repoFullName, branch, installationId });

    const [row] = await db
      .select({ id: repoSync.id })
      .from(repoSync)
      .where(eq(repoSync.repoFullName, repoFullName))
      .limit(1);

    return {
      repoSyncId: row?.id ?? repoSyncId,
      status: "pending",
    };
  }
}
