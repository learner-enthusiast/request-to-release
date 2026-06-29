import { and, count, eq, gte, db, sql } from "@repo/database";
import { pullRequest } from "@repo/database/schema";
import { AppError, errors } from "@repo/errors";

import GithubInstallationService from "./installation.js";

export const FREE_MONTHLY_LIMIT = 5;

export type UsageSummary = {
  used: number;
  limit: number | null;
};

type UserSubscription = {
  plan: "free" | "pro";
  status: "active" | "inactive" | "canceled";
};

const installations = new GithubInstallationService();

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** TODO: replace when billing/subscription service exists */
async function getUserSubscription(_userId: string): Promise<UserSubscription> {
  return { plan: "free", status: "active" };
}

export async function getReviewsThisMonth(userId: string): Promise<number | undefined> {
  const { installationId } = await installations.getUserInstallationId({ userId });
  if (!installationId) {
    return 0;
  }
  const monthStart = startOfMonth(new Date());
  try {
    const [result] = await db
      .select({
        count: sql<number>`coalesce(sum(
          (
            select count(*)::int
            from unnest(coalesce(${pullRequest.reviewedAt}, ARRAY[]::timestamp[])) as t(r)
            where r >= ${monthStart}
          )
        ), 0)`.mapWith(Number),
      })
      .from(pullRequest)
      .where(
        and(eq(pullRequest.installationId, installationId), eq(pullRequest.status, "reviewed")),
      );
    return result?.count ?? 0;
  } catch (error) {
    if (error instanceof AppError) throw error;
    errors.internal("Failed to fetch review usage", error);
  }
}

export async function canUserReview(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);

  if (subscription.plan === "pro" && subscription.status === "active") {
    return true;
  }

  const used = await getReviewsThisMonth(userId);
  return used !== undefined && used < FREE_MONTHLY_LIMIT;
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const subscription = await getUserSubscription(userId);
  const used = await getReviewsThisMonth(userId);
  if (used === undefined) {
    return { used: 0, limit: null };
  }
  if (subscription.plan === "pro" && subscription.status === "active") {
    return { used, limit: null };
  }

  return { used, limit: FREE_MONTHLY_LIMIT };
}
