import { db, eq } from "@repo/database";
import { repoSync } from "@repo/database/schema";

import { inngest } from "../inngest/client.js";
import { chunkRepoFiles } from "./chunk-repo-code.js";
import { getRepoFiles } from "./repo-files.js";
import { buildRepoNamespace, deleteRepoNamespace, saveRepoChunks } from "./vector.js";
import { errors } from "@repo/errors";

export const syncRepoCodebaseJob = inngest.createFunction(
  {
    id: "sync-repo-codebase",
    triggers: { event: "repo/sync.requested" },
    onFailure: async ({ event, step }) => {
      const repoSyncId = event.data.event.data.repoSyncId as string;
      await step.run("mark-sync-failed", async () => {
        await db.update(repoSync).set({ status: "failed" }).where(eq(repoSync.id, repoSyncId));
      });
      return { repoSyncId, chunkCount: 0, status: "failed" as const };
    },
  },
  async ({ event, step }) => {
    const repoSyncId = event.data.repoSyncId as string;

    const sync = await step.run("load-sync-row", async () => {
      const [row] = await db.select().from(repoSync).where(eq(repoSync.id, repoSyncId)).limit(1);

      if (!row) return errors.notFound(`repoSync not found: ${repoSyncId}`);
      return row;
    });

    await step.run("mark-syncing", async () => {
      await db.update(repoSync).set({ status: "syncing" }).where(eq(repoSync.id, repoSyncId));
    });

    const namespace = buildRepoNamespace(sync.repoFullName);

    await step.run("clear-namespace", async () => {
      if (sync.syncedAt != null) {
        await deleteRepoNamespace(namespace);
      }
    });

    const chunkCount = await step.run("fetch-chunk-and-save", async () => {
      const files = await getRepoFiles(sync.installationId, sync.repoFullName, sync.branch);
      if (files.length === 0) return 0;
      const chunks = chunkRepoFiles(files);
      await saveRepoChunks(namespace, chunks);
      return chunks.length;
    });

    await step.sleep("wait-for-vectors-to-index", "20s");
    await step.run("mark-synced", async () => {
      await db
        .update(repoSync)
        .set({
          status: "synced",
          chunkCount,
          syncedAt: new Date(),
        })
        .where(eq(repoSync.id, repoSyncId));
    });

    return { repoSyncId, chunkCount, status: "synced" as const };
  },
);
