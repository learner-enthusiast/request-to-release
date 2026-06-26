import { reviewPullRequest } from "../github/ai-review.js";
import { syncRepoCodebaseJob } from "../github/sync-repo-job.js";

export const inngestFunctions = [reviewPullRequest, syncRepoCodebaseJob];
