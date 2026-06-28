import {
  submitFeatureRequestMutationInputSchema,
  submitFeatureRequestOutputSchema,
} from "@repo/services/feature-request/model";
import { featureRequestService } from "../../services";
import { authenticatedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Feature Requests"];
const getPath = generatePath("/feature-requests");

export const featureRequestRouter = router({
  submit: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/"), tags: TAGS },
    })
    .input(submitFeatureRequestMutationInputSchema)
    .output(submitFeatureRequestOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return featureRequestService.submit({
        ...input,
        userId: ctx.user,
        userEmail: ctx.session.user.email,
        userName: ctx.session.user.name,
      });
    }),
});
