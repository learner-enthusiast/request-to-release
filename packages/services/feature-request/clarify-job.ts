import { db, eq } from "@repo/database";
import { clarifications, repoSync, requests } from "@repo/database/schema";
import { errors } from "@repo/errors";

import { inngest } from "../inngest/client.js";
import { buildRepoNamespace } from "../github/vector.js";
import { runInitialClarifyDecision } from "./clarify-ai.js";
import {
  buildFeatureRequestNamespace,
  indexFeatureRequestText,
  searchPrContext,
} from "./vector.js";

async function loadRequest(requestId: number) {
  const [row] = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
  if (!row) errors.notFound("Feature request");
  return row;
}

async function loadRepoSnippets(requestId: number) {
  const [request] = await db
    .select({
      title: requests.title,
      description: requests.description,
      githubRepoSyncId: requests.githubRepoSyncId,
    })
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  if (!request) throw errors.notFound("Feature request");
  if (!request.githubRepoSyncId) return [] as string[];

  const [sync] = await db
    .select()
    .from(repoSync)
    .where(eq(repoSync.id, request.githubRepoSyncId))
    .limit(1);

  if (!sync || sync.status !== "synced") return [];

  return searchPrContext(
    buildRepoNamespace(sync.repoFullName),
    `${request.title}\n${request.description}`,
  );
}

async function insertClarification(
  requestId: number,
  question: string,
  type: "standard" | "feature_education" | "summary",
  required: boolean,
) {
  const [row] = await db
    .insert(clarifications)
    .values({
      requestId,
      question,
      askedBy: "ai",
      type,
      required,
      isAnswered: false,
    })
    .returning();

  await indexFeatureRequestText(
    requestId,
    `clarification--${row!.id}`,
    `Q (${type}): ${question}`,
    type,
  );

  return row!;
}

export const clarifyFeatureRequestJob = inngest.createFunction(
  {
    id: "clarify-feature-request",
    triggers: [
      { event: "feature-request/created" },
      { event: "feature-request/clarification.requested" },
    ],
  },
  async ({ event, step }) => {
    const requestId = event.data.requestId as number;

    const request = await step.run("load-request", () => loadRequest(requestId));
    if (!request) return { requestId, skipped: true, reason: "request_not_found" };
    if (request.status !== "NEW" && request.status !== "CLARIFYING") {
      return { requestId, skipped: true, reason: "invalid_status" };
    }

    await step.run("index-request", async () => {
      await indexFeatureRequestText(
        requestId,
        `request--${requestId}`,
        `Title: ${request.title}\nDescription: ${request.description}`,
        "request",
      );
    });

    const repoSnippets = await step.run("search-codebase", () => loadRepoSnippets(requestId));

    const decision = await step.run("ai-initial-decision", () =>
      runInitialClarifyDecision({
        title: request.title,
        description: request.description,
        repoSnippets,
        qaHistory: "",
      }),
    );

    if (decision.path === "exists" && decision.existingFeature) {
      await step.run("apply-exists-path", async () => {
        const links = decision.existingFeature!.docLinks.map((l) => `- ${l}`).join("\n");
        const question = [
          `We may already support this: **${decision.existingFeature!.name}**`,
          decision.existingFeature!.summary,
          links,
          "",
          "Reply **acknowledge** if this solves your need.",
          "Reply **different** and describe what is different.",
        ].join("\n");

        await insertClarification(requestId, question, "feature_education", true);

        await db
          .update(requests)
          .set({ status: "AWAITING_APPROVAL" })
          .where(eq(requests.id, requestId));
      });

      return { requestId, path: "exists" };
    }
    if (!request) return { requestId, skipped: true, reason: "request_not_found" };
    if (decision.path === "clear") {
      await step.run("apply-clear-path", async () => {
        const summary =
          decision.summary ??
          `Understood scope for "${request.title}": ${request.description.slice(0, 500)}`;

        await insertClarification(
          requestId,
          `Please review this scope summary and reply **approve** or suggest changes:\n\n${summary}`,
          "summary",
          true,
        );

        await db.update(requests).set({ status: "CLARIFYING" }).where(eq(requests.id, requestId));
      });

      return { requestId, path: "clear" };
    }

    await step.run("apply-clarify-path", async () => {
      const questions = decision.questions ?? [];
      if (questions.length === 0) {
        errors.internal("AI returned clarify path with no questions");
      }

      for (const q of questions) {
        await insertClarification(requestId, q.text, "standard", q.required);
      }

      await db.update(requests).set({ status: "CLARIFYING" }).where(eq(requests.id, requestId));
    });

    return { requestId, path: "clarify", questionCount: decision.questions?.length ?? 0 };
  },
);
