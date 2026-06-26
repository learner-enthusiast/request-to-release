import { randomUUID } from "node:crypto";
import { db, eq, inArray } from "@repo/database";
import { repoSync } from "@repo/database/schema";
import { errors } from "@repo/errors";

import { getInstallationOctokit } from "../Octokit/index.js";
import { inngest } from "../inngest/client.js";
import GithubInstallationService from "./installation.js";
import type {
  GetRepoSyncStatusesInput,
  GetRepoSyncStatusesOutput,
  SyncRepoCodebaseInput,
  SyncRepoCodebaseOutput,
} from "./model.js";

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

    const [row] = await db
      .select({ id: repoSync.id })
      .from(repoSync)
      .where(eq(repoSync.repoFullName, repoFullName))
      .limit(1);

    const id = row?.id ?? repoSyncId;

    await inngest.send({
      name: "repo/sync.requested",
      data: { repoSyncId: id },
    });

    return { repoSyncId: id, status: "pending" };
  }

  async getRepoSyncStatuses(input: GetRepoSyncStatusesInput): Promise<GetRepoSyncStatusesOutput> {
    const rows = await db
      .select({ repoFullName: repoSync.repoFullName, status: repoSync.status })
      .from(repoSync)
      .where(inArray(repoSync.repoFullName, input.repoFullNames));

    const statuses: GetRepoSyncStatusesOutput = {};
    for (const row of rows) {
      statuses[row.repoFullName] = row.status as GetRepoSyncStatusesOutput[string];
    }
    return statuses;
  }
}
