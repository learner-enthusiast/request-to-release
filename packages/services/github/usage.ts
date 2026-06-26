import { and, count, eq, gte, db } from "@repo/database";
import { pullRequest } from "@repo/database/schema";

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

export async function getReviewsThisMonth(userId: string): Promise<number> {
  const { installationId } = await installations.getUserInstallationId({ userId });

  if (!installationId) {
    return 0;
  }

  const [result] = await db
    .select({ count: count() })
    .from(pullRequest)
    .where(
      and(
        eq(pullRequest.installationId, installationId),
        eq(pullRequest.status, "reviewed"),
        gte(pullRequest.reviewedAt, startOfMonth(new Date())),
      ),
    );

  return result?.count ?? 0;
}

export async function canUserReview(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);

  if (subscription.plan === "pro" && subscription.status === "active") {
    return true;
  }

  const used = await getReviewsThisMonth(userId);
  return used < FREE_MONTHLY_LIMIT;
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const subscription = await getUserSubscription(userId);
  const used = await getReviewsThisMonth(userId);

  if (subscription.plan === "pro" && subscription.status === "active") {
    return { used, limit: null };
  }

  return { used, limit: FREE_MONTHLY_LIMIT };
}
