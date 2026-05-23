import { z } from "zod";
import { questionOutputModel } from "../questions/model";

const answerInputModel = z.object({
  questionId: z.uuid(),
  value: z.unknown(),
});

export const submitFormResponseInputModel = z
  .object({
    formSlug: z.string().min(1).max(255),

    // optional metadata / respondent display name
    name: z.string().min(1).max(80).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),

    answers: z.array(answerInputModel).default([]),
  })
  .superRefine((v, ctx) => {
    const ids = v.answers.map((a) => a.questionId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Duplicate answers for the same questionId" });
    }
  });
export const submitFormResponseOpenApiInputModel = z.object({
  formSlug: z.string().min(1).max(255),
  name: z.string().min(1).max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  answers: z.array(answerInputModel).optional(),
});
export type SubmitFormResponseInputModelType = z.infer<typeof submitFormResponseInputModel>;

export const submitFormResponseOutputModel = z.object({
  success: z.boolean(),
  responseId: z.uuid(),
});

export type SubmitFormResponseOutputModelType = z.infer<typeof submitFormResponseOutputModel>;

const isoDateTimeString = z.string().datetime();

export const listResponsesByFormIdInputModel = z.object({
  formId: z.uuid().describe("Form id (owner only)"),
});
export type ListResponsesByFormIdInputModelType = z.infer<typeof listResponsesByFormIdInputModel>;

export const answerWithQuestionOutputModel = z.object({
  id: z.uuid(),
  responseId: z.uuid(),
  questionId: z.uuid(),
  value: z.unknown(),
  createdAt: isoDateTimeString,
  question: questionOutputModel,
});

export const formResponseWithAnswersOutputModel = z.object({
  id: z.uuid(),
  formId: z.uuid(),
  name: z.string().nullable(),
  respondentId: z.uuid().nullable(),
  metadata: z.unknown().nullable(),
  completedAt: isoDateTimeString.nullable(),
  createdAt: isoDateTimeString,
  answers: z.array(answerWithQuestionOutputModel),
});

export const listResponsesByFormIdOutputModel = z.array(formResponseWithAnswersOutputModel);
export type ListResponsesByFormIdOutputModelType = z.infer<typeof listResponsesByFormIdOutputModel>;
