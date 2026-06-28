import { db, eq } from "@repo/database";
import { clarifications, repoSync, requests } from "@repo/database/schema";
import { errors } from "@repo/errors";

import { inngest } from "../inngest/client.js";
import { buildRepoNamespace } from "../github/vector.js";
import { runReviewClarificationsDecision } from "./clarify-ai.js";
import { indexFeatureRequestText, searchPrContext } from "./vector.js";

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

  if (!request) return errors.notFound("Feature request");
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

export const reviewClarificationsJob = inngest.createFunction(
  {
    id: "review-feature-request-clarifications",
    triggers: [{ event: "feature-request/clarifications.completed" }],
  },
  async ({ event, step }) => {
    const requestId = event.data.requestId as number;
    const intent = event.data.intent as string | undefined;
    const feedback = event.data.feedback as string | undefined;

    const request = await step.run("load-request", () => loadRequest(requestId));
    if (!request) return { requestId, skipped: true, reason: "request_not_found" };
    const qaRows = await step.run("load-clarifications", () =>
      db.select().from(clarifications).where(eq(clarifications.requestId, requestId)),
    );

    const qaHistory = qaRows
      .map((r) => `Q: ${r.question}\nA: ${r.answer ?? "(pending)"}`)
      .join("\n\n");

    const repoSnippets = await step.run("search-codebase", () => loadRepoSnippets(requestId));

    const extraContext =
      intent === "different"
        ? "Customer says their need is DIFFERENT from the existing feature."
        : intent === "summary_rejected"
          ? `Customer rejected the summary. Feedback: ${feedback ?? ""}`
          : undefined;

    const decision = await step.run("ai-review-decision", () =>
      runReviewClarificationsDecision({
        title: request.title,
        description: request.description,
        repoSnippets,
        qaHistory,
        extraContext,
      }),
    );

    if (decision.outcome === "more_questions") {
      await step.run("insert-follow-up-questions", async () => {
        for (const q of decision.questions ?? []) {
          await insertClarification(requestId, q.text, "standard", q.required);
        }
        await db.update(requests).set({ status: "CLARIFYING" }).where(eq(requests.id, requestId));
      });
      return { requestId, outcome: "more_questions" };
    }

    if (decision.outcome === "ready_for_summary") {
      await step.run("insert-summary", async () => {
        const summary = decision.summary ?? "Scope summary pending.";
        await insertClarification(
          requestId,
          `Please review this scope summary and reply **approve** or suggest changes:\n\n${summary}`,
          "summary",
          true,
        );
        await db.update(requests).set({ status: "CLARIFYING" }).where(eq(requests.id, requestId));
      });
      return { requestId, outcome: "ready_for_summary" };
    }

    await step.run("mark-awaiting-team-approval", async () => {
      await db
        .update(requests)
        .set({ status: "AWAITING_APPROVAL" })
        .where(eq(requests.id, requestId));
    });

    return { requestId, outcome: "ready_for_team" };
  },
);
