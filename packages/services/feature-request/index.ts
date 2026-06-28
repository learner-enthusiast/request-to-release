import { and, db, eq, inArray } from "@repo/database";
import { clarifications, requests } from "@repo/database/schema";
import { errors } from "@repo/errors";

import { inngest } from "../inngest/client.js";
import type {
  SubmitClarificationAnswersInput,
  SubmitClarificationAnswersOutput,
  SubmitFeatureRequestInput,
  SubmitFeatureRequestOutput,
} from "./model.js";
import { toPublicRequestId } from "./model.js";

const ANSWERABLE_STATUSES = new Set(["CLARIFYING", "AWAITING_APPROVAL"]);

type RequestRow = typeof requests.$inferSelect;
type ClarificationRow = typeof clarifications.$inferSelect;

function assertRequester(request: RequestRow, userId: string, userEmail: string) {
  const isOwner =
    request.customerEmail.toLowerCase() === userEmail.toLowerCase() || request.createdBy === userId;

  if (!isOwner) {
    errors.forbidden("You are not allowed to answer clarifications for this request");
  }
}

function isAcknowledgeAnswer(answer: string) {
  const normalized = answer.trim().toLowerCase();
  return (
    normalized === "acknowledge" ||
    normalized === "yes" ||
    normalized.includes("this is enough") ||
    normalized.includes("existing feature is fine")
  );
}

function isDifferentRequestAnswer(answer: string) {
  const normalized = answer.trim().toLowerCase();
  return (
    normalized === "different" ||
    normalized.includes("different request") ||
    normalized.includes("not the same")
  );
}

function isSummaryApproval(answer: string) {
  const normalized = answer.trim().toLowerCase();
  return (
    normalized === "approve" ||
    normalized === "approved" ||
    normalized === "yes" ||
    normalized.includes("looks good") ||
    normalized.includes("approve summary")
  );
}

async function countPendingRequired(requestId: number) {
  const pending = await db
    .select({ id: clarifications.id })
    .from(clarifications)
    .where(
      and(
        eq(clarifications.requestId, requestId),
        eq(clarifications.required, true),
        eq(clarifications.isAnswered, false),
      ),
    );

  return pending.length;
}

async function getRequestStatus(requestId: number) {
  const [row] = await db
    .select({ status: requests.status })
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  if (!row) {
    throw errors.notFound("Feature request");
  }

  return row.status;
}

export default class FeatureRequestService {
  async submit(input: SubmitFeatureRequestInput): Promise<SubmitFeatureRequestOutput> {
    const customerEmail = input.customerEmail ?? input.userEmail;
    const customerName = input.customerName ?? input.userName ?? null;

    const [row] = await db
      .insert(requests)
      .values({
        title: input.title,
        description: input.description,
        customerEmail,
        customerName,
        source: input.source,
        sourceId: input.sourceId,
        priority: input.priority,
        deadline: input.deadline,
        status: "NEW",
        phase: "1",
        createdBy: input.userId,
      })
      .returning({
        id: requests.id,
        title: requests.title,
        customerEmail: requests.customerEmail,
        priority: requests.priority,
        status: requests.status,
        createdAt: requests.createdAt,
      });

    if (!row) {
      throw errors.internal("Failed to create feature request");
    }

    inngest.send({
      name: "feature-request/created",
      data: { requestId: row.id },
    });

    return {
      id: row.id,
      publicId: toPublicRequestId(row.id),
      status: "NEW",
      title: row.title,
      customerEmail: row.customerEmail,
      priority: row.priority as SubmitFeatureRequestOutput["priority"],
      createdAt: row.createdAt.toISOString(),
    };
  }

  async submitClarificationAnswers(
    input: SubmitClarificationAnswersInput,
  ): Promise<SubmitClarificationAnswersOutput> {
    const [request] = await db
      .select()
      .from(requests)
      .where(eq(requests.id, input.requestId))
      .limit(1);

    if (!request) {
      return errors.notFound("Feature request");
    }

    assertRequester(request, input.userId, input.userEmail);

    if (!ANSWERABLE_STATUSES.has(request.status)) {
      errors.validation("This request is not waiting for clarification answers", {
        status: request.status,
      });
    }

    const clarificationIds = input.answers.map((a) => a.clarificationId);
    const answerById = new Map(input.answers.map((a) => [a.clarificationId, a.answer]));

    const rows = await db
      .select()
      .from(clarifications)
      .where(
        and(
          eq(clarifications.requestId, input.requestId),
          inArray(clarifications.id, clarificationIds),
        ),
      );

    if (rows.length !== clarificationIds.length) {
      errors.validation("One or more clarification IDs are invalid for this request");
    }

    const alreadyAnswered = rows.filter((r) => r.isAnswered);
    if (alreadyAnswered.length > 0) {
      errors.validation("One or more clarifications were already answered", {
        clarificationIds: alreadyAnswered.map((r) => r.id),
      });
    }

    const now = new Date();

    for (const row of rows) {
      const answer = answerById.get(row.id);
      if (!answer) continue;

      await db
        .update(clarifications)
        .set({
          answer,
          isAnswered: true,
          answeredAt: now,
          answeredBy: input.userEmail,
        })
        .where(eq(clarifications.id, row.id));
    }

    // Special handling when user responds to a single AI clarification
    if (rows.length === 1) {
      const row = rows[0]!;
      const answer = answerById.get(row.id)!;

      if (row.type === "feature_education") {
        if (isAcknowledgeAnswer(answer)) {
          await db
            .update(requests)
            .set({ status: "ARCHIVED" })
            .where(eq(requests.id, input.requestId));

          return this.buildClarificationResponse(input.requestId, input.answers.length, 0);
        }

        if (isDifferentRequestAnswer(answer)) {
          await inngest.send({
            name: "feature-request/clarifications.completed",
            data: { requestId: input.requestId, intent: "different" },
          });

          return this.buildClarificationResponse(input.requestId, input.answers.length);
        }
      }

      if (row.type === "summary") {
        if (isSummaryApproval(answer)) {
          await db
            .update(requests)
            .set({ status: "AWAITING_APPROVAL" })
            .where(eq(requests.id, input.requestId));

          return this.buildClarificationResponse(input.requestId, input.answers.length, 0);
        }

        await inngest.send({
          name: "feature-request/clarifications.completed",
          data: {
            requestId: input.requestId,
            intent: "summary_rejected",
            feedback: answer,
          },
        });

        return this.buildClarificationResponse(input.requestId, input.answers.length);
      }
    }

    const unansweredRequiredCount = await countPendingRequired(input.requestId);
    const allRequiredAnswered = unansweredRequiredCount === 0;

    if (allRequiredAnswered) {
      await inngest.send({
        name: "feature-request/clarifications.completed",
        data: { requestId: input.requestId },
      });
    }

    return this.buildClarificationResponse(
      input.requestId,
      input.answers.length,
      unansweredRequiredCount,
    );
  }

  private async buildClarificationResponse(
    requestId: number,
    answeredCount: number,
    unansweredRequiredCount?: number,
  ): Promise<SubmitClarificationAnswersOutput> {
    const pending = unansweredRequiredCount ?? (await countPendingRequired(requestId));
    const status = await getRequestStatus(requestId);

    return {
      requestId,
      publicId: toPublicRequestId(requestId),
      status: status as SubmitClarificationAnswersOutput["status"],
      answeredCount,
      unansweredRequiredCount: pending,
      allRequiredAnswered: pending === 0,
    };
  }
}
