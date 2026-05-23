import { formService, questionService } from "../../services";
import {
  createFormInputModel,
  createFormOutputModel,
  updateFormOutputModel,
  deleteFormInputModel,
  deleteFormOutputModel,
  getFormByIdInputModel,
  getFormByIdOutputModel,
  publishFormInputModel,
  publishFormOutputModel,
  listFormsOwnedByUserOutputModel,
  getPublishedFormWithQuestionsBySlugInputModel,
  getPublishedFormWithQuestionsBySlugOutputModel,
  updateFormInputBaseModel,
} from "@repo/services/forms/model";

import {
  createQuestionInputModel,
  CreateQuestionInputModelType,
  createQuestionOpenApiInputModel,
  createQuestionOutputModel,
  deleteQuestionInputModel,
  deleteQuestionOutputModel,
  updateQuestionInputBaseModel,
  updateQuestionOutputModel,
} from "@repo/services/questions/model";
import { authenticatedProcedure, publicProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { zodUndefinedModel } from "../../schema";

const TAGS = ["Forms"];
const getPath = generatePath("/forms");

export const formRouter = router({
  createDraftForm: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createFormInputModel)
    .output(createFormOutputModel)
    .mutation(async ({ input, ctx }) => {
      const createdDraftForm = await formService.createDraftFormForOwner({
        ownerId: ctx.user,
        ...input,
      });
      return createdDraftForm;
    }),

  patchOwnedForm: authenticatedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/"), tags: TAGS } })
    .input(updateFormInputBaseModel)
    .output(updateFormOutputModel)
    .mutation(async ({ input, ctx }) => {
      const updatedForm = await formService.patchOwnedFormConfiguration({
        ownerId: ctx.user,
        ...input,
      });
      return updatedForm;
    }),

  deleteOwnedForm: authenticatedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/"), tags: TAGS } })
    .input(deleteFormInputModel)
    .output(deleteFormOutputModel)
    .mutation(async ({ input, ctx }) => {
      const deleteResult = await formService.deleteOwnedForm({
        ownerId: ctx.user,
        ...input,
      });
      return deleteResult;
    }),

  getOwnedFormById: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/by-id"), tags: TAGS } })
    .input(getFormByIdInputModel)
    .output(getFormByIdOutputModel)
    .query(async ({ input, ctx }) => {
      const form = await formService.getOwnedFormById({
        ownerId: ctx.user,
        ...input,
      });
      return form;
    }),

  publishOwnedForm: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/publish"), tags: TAGS } })
    .input(publishFormInputModel)
    .output(publishFormOutputModel)
    .mutation(async ({ input, ctx }) => {
      const publishResult = await formService.publishOwnedFormAndGetShareLink({
        ownerId: ctx.user,
        ...input,
      });
      return publishResult;
    }),

  listMyForms: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listFormsOwnedByUserOutputModel)
    .query(async ({ ctx }) => {
      const myForms = await formService.listFormsOwnedByUser({ userId: ctx.user });
      return myForms;
    }),
  createQuestion: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/question"), tags: TAGS } })
    .input(createQuestionOpenApiInputModel)
    .output(createQuestionOutputModel)
    .mutation(async ({ input, ctx }) => {
      const createdQuestion = await questionService.createQuestionOnOwnedForm(
        ctx.user,
        input as CreateQuestionInputModelType,
      );
      return createdQuestion;
    }),
  updateQuestion: authenticatedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/question"), tags: TAGS } })
    .input(updateQuestionInputBaseModel)
    .output(updateQuestionOutputModel)
    .mutation(async ({ input, ctx }) => {
      const updatedQuestion = await questionService.updateQuestionOnOwnedForm(ctx.user, input);
      return updatedQuestion;
    }),
  deleteQuestion: authenticatedProcedure
    .meta({ openapi: { method: "DELETE", path: getPath("/question"), tags: TAGS } })
    .input(deleteQuestionInputModel)
    .output(deleteQuestionOutputModel)
    .mutation(async ({ input, ctx }) => {
      const result = await questionService.deleteQuestionFromOwnedForm(ctx.user, input);
      return result;
    }),
  getPublishedFormWithQuestionsBySlug: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/public/by-slug"), tags: TAGS } })
    .input(getPublishedFormWithQuestionsBySlugInputModel)
    .output(getPublishedFormWithQuestionsBySlugOutputModel)
    .query(async ({ input }) => {
      const result = await formService.getPublishedFormWithQuestionsBySlug(input);
      return result;
    }),
});
