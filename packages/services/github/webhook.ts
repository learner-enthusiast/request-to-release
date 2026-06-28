import { randomUUID } from "node:crypto";
import { verify } from "@octokit/webhooks-methods";
import { and, eq, db } from "@repo/database";
import { pullRequest } from "@repo/database/schema";
import { errors } from "@repo/errors";
import { ingest, logger } from "@repo/logger";

import { env } from "../env.js";
import GithubInstallationService from "./installation.js";
import { GithubWebhookResult, PullRequestWebhookPayload } from "./model.js";
import { canUserReview } from "./usage.js";
import { inngest } from "../inngest/client.js";

const REVIEWABLE_ACTIONS = ["opened", "synchronize", "reopened"] as const;

type ReviewableAction = (typeof REVIEWABLE_ACTIONS)[number];

function getAuthorLogin(user: PullRequestWebhookPayload["pull_request"]["user"]): string | null {
  return user?.login ?? null;
}

function isReviewableAction(action: string): action is ReviewableAction {
  return REVIEWABLE_ACTIONS.includes(action as ReviewableAction);
}

export default class GithubWebhookService {
  constructor(private readonly installations = new GithubInstallationService()) {}

  async verifySignature(payload: string, signature: string | null): Promise<boolean> {
    if (!signature) return false;
    return verify(env.GITHUB_WEBHOOK_SECRET, payload, signature);
  }

  async handleWebhook(input: {
    payload: string;
    signature: string | null;
    eventName: string | null;
  }): Promise<GithubWebhookResult> {
    const isValid = await this.verifySignature(input.payload, input.signature);
    if (!isValid) {
      return errors.unauthorized("Invalid GitHub webhook signature");
    }

    const event = JSON.parse(input.payload) as Record<string, unknown>;
    console.log("event", event);
    console.log("input.eventName", input.eventName);
    if (input.eventName === "installation" && event.action === "deleted") {
      const installationId = (event.installation as { id: number }).id;
      await this.handleInstallationDeleted(installationId);
      return { received: true, handled: true };
    }

    if (input.eventName !== "pull_request") {
      return { received: true, handled: false };
    }

    const prEvent = event as PullRequestWebhookPayload;

    if (!prEvent.installation?.id) {
      logger.warn("pull_request webhook missing installation.id");
      return { received: true, handled: false };
    }

    if (!isReviewableAction(prEvent.action)) {
      return { received: true, handled: false };
    }

    const saved = await this.savePullRequest(prEvent);

    const { userId } = await this.installations.getUserIdByInstallationId({
      installationId: prEvent.installation.id,
    });

    if (userId) {
      // TODO: canUserReview(userId) when billing/limits exist
      const allowed = await canUserReview(userId);

      if (!allowed) {
        await db
          .update(pullRequest)
          .set({ status: "rate_limited" })
          .where(eq(pullRequest.id, saved.id));

        return { received: true, handled: true, rateLimited: true };
      }
    }

    logger.info("PR saved from webhook", { pullRequestId: saved.id });
    await inngest.send({
      name: "github/pr.received",
      data: { pullRequestId: saved.id },
    });
    await ingest({
      level: "info",
      event: "github.webhook.pr.enqueued", // more accurate name
      message: "PR saved, review enqueued",
      meta: { pullRequestId: saved.id, installationId: prEvent.installation.id },
    });

    return { received: true, handled: true };
  }

  async savePullRequest(payload: PullRequestWebhookPayload) {
    const repoFullName = payload.repository.full_name;
    const prNumber = payload.pull_request.number;
    const installationId = payload.installation!.id;

    const [existing] = await db
      .select({ id: pullRequest.id })
      .from(pullRequest)
      .where(and(eq(pullRequest.repoFullName, repoFullName), eq(pullRequest.prNumber, prNumber)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(pullRequest)
        .set({
          title: payload.pull_request.title,
          headSha: payload.pull_request.head.sha,
          status: "pending",
        })
        .where(eq(pullRequest.id, existing.id))
        .returning();

      return updated!;
    }

    const [created] = await db
      .insert(pullRequest)
      .values({
        id: randomUUID(),
        installationId,
        repoFullName,
        prNumber,
        title: payload.pull_request.title,
        authorLogin: getAuthorLogin(payload.pull_request.user),
        headSha: payload.pull_request.head.sha,
        baseBranch: payload.pull_request.base.ref,
        status: "pending",
      })
      .returning();

    return created!;
  }

  private async handleInstallationDeleted(installationId: number) {
    const { userId } = await this.installations.getUserIdByInstallationId({ installationId });
    if (!userId) return;

    await this.installations.deleteInstallation({ userId });
    logger.info("installation deleted via webhook", { installationId, userId });
  }
}

export const githubWebhookService = new GithubWebhookService();
