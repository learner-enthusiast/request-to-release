import { clarifyFeatureRequestJob } from "../feature-request/clarify-job.js";
import { reviewClarificationsJob } from "../feature-request/review-clarifications-job.js";
import { reviewPullRequest } from "../github/ai-review.js";
import { syncRepoCodebaseJob } from "../github/sync-repo-job.js";

export const inngestFunctions = [
  reviewPullRequest,
  syncRepoCodebaseJob,
  clarifyFeatureRequestJob,
  reviewClarificationsJob,
];
