import { db, eq } from "@repo/database";
import { pullRequest, repoSync } from "@repo/database/schema";

import { inngest } from "../inngest/client.js";

import {
  buildPrNamespace,
  buildRepoNamespace,
  saveChunksToPinecone,
  searchPrContext,
} from "./vector.js";
import { getPullRequestFiles } from "./pr-files.js";
import { chunkPrFiles } from "./chunk-code.js";
import { generateReview } from "./generate-review.js";
import { postPrComment } from "./post-pr-comment.js";
import { errors } from "@repo/errors";

export const reviewPullRequest = inngest.createFunction(
  { id: "review-pull-request", triggers: { event: "github/pr.received" } },
  async ({ event, step }) => {
    const pullRequestId = event.data.pullRequestId as string;

    const pr = await step.run("mark-processing", async () => {
      const [updated] = await db
        .update(pullRequest)
        .set({ status: "processing" })
        .where(eq(pullRequest.id, pullRequestId))
        .returning();

      if (!updated) return errors.notFound(`Pull request not found: ${pullRequestId}`);
      return updated;
    });

    const chunks = await step.run("breakdown-code", async () => {
      const files = await getPullRequestFiles(pr.installationId, pr.repoFullName, pr.prNumber);
      return chunkPrFiles(pr.prNumber, files);
    });

    if (chunks.length === 0) {
      await step.run("mark-reviewed-no-code", async () => {
        await db
          .update(pullRequest)
          .set({ status: "reviewed" })
          .where(eq(pullRequest.id, pullRequestId));
      });
      return { pullRequestId, status: "reviewed", reason: "no code to review" };
    }

    const namespace = buildPrNamespace(pr.repoFullName, pr.prNumber);

    await step.run("save-vectors-to-pinecone", async () => {
      await saveChunksToPinecone(namespace, chunks);
    });

    await step.sleep("wait-for-vectors-to-index", "10s");

    const repoContextSnippets = await step.run("search-repo-context", async () => {
      const [sync] = await db
        .select()
        .from(repoSync)
        .where(eq(repoSync.repoFullName, pr.repoFullName))
        .limit(1);

      if (!sync || sync.status !== "synced") return [];

      const repoNamespace = buildRepoNamespace(pr.repoFullName);
      return searchPrContext(repoNamespace, pr.title);
    });

    const review = await step.run("generate-ai-review", async () => {
      const contextSnippets = await searchPrContext(namespace, pr.title);
      return generateReview({
        repoFullName: pr.repoFullName,
        title: pr.title,
        contextSnippets,
        repoContextSnippets,
      });
    });

    await step.run("post-pr-comment", async () => {
      await postPrComment(pr.installationId, pr.repoFullName, pr.prNumber, review);
    });

    await step.run("mark-reviewed", async () => {
      await db
        .update(pullRequest)
        .set({
          status: "reviewed",
          reviewComment: review,
          reviewedAt: new Date(),
        })
        .where(eq(pullRequest.id, pullRequestId));
    });

    return { pullRequestId, status: "reviewed" };
  },
);
