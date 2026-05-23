import { publicProcedure, authenticatedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { formResponseService } from "../../services";
import {
  listResponsesByFormIdInputModel,
  listResponsesByFormIdOutputModel,
  SubmitFormResponseInputModelType,
  submitFormResponseOpenApiInputModel,
  submitFormResponseOutputModel,
} from "@repo/services/form-responses/model";

const TAGS = ["Form Responses"];
const getPath = generatePath("/form-responses");

export const formResponseRouter = router({
  submitAnonymousFormResponse: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/submit-anonymous"), tags: TAGS } })
    .input(submitFormResponseOpenApiInputModel)
    .output(submitFormResponseOutputModel)
    .mutation(async ({ input }) => {
      const result = await formResponseService.submitResponseForFormSlug({
        respondentId: null,
        input: input as SubmitFormResponseInputModelType,
        requireAnonymous: true,
        requireAuthenticated: false,
      });
      return result;
    }),

  submitAuthenticatedFormResponse: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/submit"), tags: TAGS } })
    .input(submitFormResponseOpenApiInputModel)
    .output(submitFormResponseOutputModel)
    .mutation(async ({ input, ctx }) => {
      const result = await formResponseService.submitResponseForFormSlug({
        respondentId: ctx.user,
        input: input as SubmitFormResponseInputModelType,
        requireAnonymous: false,
        requireAuthenticated: true,
      });
      return result;
    }),
  listResponsesByFormId: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/by-form"), tags: TAGS } })
    .input(listResponsesByFormIdInputModel)
    .output(listResponsesByFormIdOutputModel)
    .query(async ({ input, ctx }) => {
      const result = await formResponseService.listResponsesWithAnswersForOwnedForm(
        ctx.user,
        input,
      );
      return result;
    }),
});
