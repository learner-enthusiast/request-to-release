import { db, eq } from "@repo/database";
import { repoSync } from "@repo/database/schema";

import { inngest } from "../inngest/client.js";
import { chunkRepoFiles } from "./chunk-repo-code.js";
import { getRepoFiles } from "./repo-files.js";
import { buildRepoNamespace, deleteRepoNamespace, saveRepoChunks } from "./vector.js";

export const syncRepoCodebaseJob = inngest.createFunction(
  { id: "sync-repo-codebase", triggers: { event: "repo/sync.requested" } },
  async ({ event, step }) => {
    const repoSyncId = event.data.repoSyncId as string;

    const sync = await step.run("load-sync-row", async () => {
      const [row] = await db.select().from(repoSync).where(eq(repoSync.id, repoSyncId)).limit(1);

      if (!row) throw new Error(`repoSync not found: ${repoSyncId}`);
      return row;
    });

    await step.run("mark-syncing", async () => {
      await db.update(repoSync).set({ status: "syncing" }).where(eq(repoSync.id, repoSyncId));
    });

    const namespace = buildRepoNamespace(sync.repoFullName);

    await step.run("clear-namespace", async () => {
      await deleteRepoNamespace(namespace);
    });

    const chunkCount = await step.run("fetch-chunk-and-index", async () => {
      const files = await getRepoFiles(sync.installationId, sync.repoFullName, sync.branch);
      const chunks = chunkRepoFiles(files);
      await saveRepoChunks(namespace, chunks);
      return chunks.length;
    });

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
