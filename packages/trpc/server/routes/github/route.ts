import {
  deleteInstallationOutputSchema,
  getInstallationStatusOutputSchema,
  getInstallUrlOutputSchema,
  getUserIdByInstallationIdMutationInputSchema,
  getUserIdByInstallationIdOutputSchema,
  getUserInstallationIdOutputSchema,
  saveInstallationMutationInputSchema,
  saveInstallationOutputSchema,
  syncRepoCodebaseMutationInputSchema,
  syncRepoCodebaseOutputSchema,
} from "@repo/services/github/model";
import { getGithubInstallUrl } from "@repo/services/Octokit";

import { z, zodUndefinedModel } from "../../schema";
import { githubInstallationService, githubSyncRepoCodebaseService } from "../../services";
import { authenticatedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["GitHub"];
const getPath = generatePath("/github");

export const githubRouter = router({
  getInstallationStatus: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/installation-status"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(getInstallationStatusOutputSchema)
    .query(async ({ ctx }) => {
      return githubInstallationService.getInstallationStatus({ userId: ctx.user });
    }),

  getInstallUrl: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/install-url"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(getInstallUrlOutputSchema)
    .query(async ({ ctx }) => {
      return { url: getGithubInstallUrl(ctx.user) };
    }),

  getUserInstallationId: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/installation-id"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(getUserInstallationIdOutputSchema)
    .query(async ({ ctx }) => {
      return githubInstallationService.getUserInstallationId({ userId: ctx.user });
    }),

  getUserIdByInstallationId: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/user-by-installation"), tags: TAGS } })
    .input(getUserIdByInstallationIdMutationInputSchema)
    .output(getUserIdByInstallationIdOutputSchema)
    .query(async ({ input }) => {
      return githubInstallationService.getUserIdByInstallationId({
        installationId: input.installationId,
      });
    }),

  saveInstallation: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/installation"), tags: TAGS } })
    .input(saveInstallationMutationInputSchema)
    .output(saveInstallationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return githubInstallationService.saveInstallation({
        userId: ctx.user,
        installationId: input.installationId,
      });
    }),

  disconnect: authenticatedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/installation"), tags: TAGS } })
    .output(deleteInstallationOutputSchema)
    .mutation(async ({ ctx }) => {
      return githubInstallationService.deleteInstallation({ userId: ctx.user });
    }),
  syncRepoCodebase: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/repo-sync"), tags: TAGS },
    })
    .input(syncRepoCodebaseMutationInputSchema)
    .output(syncRepoCodebaseOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return githubSyncRepoCodebaseService.triggerRepoSync({
        userId: ctx.user,
        repoFullName: input.repoFullName,
        branch: input.branch,
      });
    }),
});
