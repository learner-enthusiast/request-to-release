import { z } from "zod";

import { userIdSchema } from "../github/model.js";

export const requestSourceSchema = z.enum(["form", "email", "api", "ticket"]);
export const requestPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const requestStatusSchema = z.enum([
  "NEW",
  "CLARIFYING",
  "AWAITING_APPROVAL",
  "APPROVED",
  "PRD_GENERATING",
  "PRD_GENERATED",
  "AWAITING_PLAN_APPROVAL",
  "PLAN_APPROVED",
  "IN_DEVELOPMENT",
  "IN_AI_REVIEW",
  "FIX_NEEDED",
  "READY_FOR_HUMAN_APPROVAL",
  "SHIPPED",
  "REJECTED",
  "ARCHIVED",
]);

/** Body from the client (authenticated submit form) */
export const submitFeatureRequestMutationInputSchema = z.object({
  title: z.string().trim().min(3, "title must be at least 3 characters").max(255),
  description: z.string().trim().min(10, "description must be at least 10 characters"),
  customerEmail: z.string().trim().email().optional(),
  customerName: z.string().trim().max(255).optional(),
  source: requestSourceSchema.default("form"),
  sourceId: z.string().trim().max(255).optional(),
  priority: requestPrioritySchema.default("MEDIUM"),
  deadline: z.coerce.date().optional(),
});

/** Service layer input — userId + email/name from session */
export const submitFeatureRequestInputSchema = submitFeatureRequestMutationInputSchema.extend({
  userId: userIdSchema,
  userEmail: z.string().trim().email(),
  userName: z.string().trim().max(255).optional(),
});

export const submitFeatureRequestOutputSchema = z.object({
  id: z.number().int().positive(),
  publicId: z.string(), // e.g. FR-123
  status: z.literal("NEW"),
  title: z.string(),
  customerEmail: z.string().email(),
  priority: requestPrioritySchema,
  createdAt: z.string(),
});

export type RequestSource = z.infer<typeof requestSourceSchema>;
export type RequestPriority = z.infer<typeof requestPrioritySchema>;
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export type SubmitFeatureRequestMutationInput = z.infer<
  typeof submitFeatureRequestMutationInputSchema
>;
export type SubmitFeatureRequestInput = z.infer<typeof submitFeatureRequestInputSchema>;
export type SubmitFeatureRequestOutput = z.infer<typeof submitFeatureRequestOutputSchema>;

export function toPublicRequestId(id: number): string {
  return `FR-${id}`;
}

export const clarificationAnswerInputSchema = z.object({
  clarificationId: z.number().int().positive(),
  answer: z.string().trim().min(1, "answer is required"),
});

/** tRPC mutation body */
export const submitClarificationAnswersMutationInputSchema = z.object({
  requestId: z.number().int().positive(),
  answers: z.array(clarificationAnswerInputSchema).min(1, "at least one answer is required"),
});

/** Service layer */
export const submitClarificationAnswersInputSchema =
  submitClarificationAnswersMutationInputSchema.extend({
    userId: userIdSchema,
    userEmail: z.string().trim().email(),
  });

export const submitClarificationAnswersOutputSchema = z.object({
  requestId: z.number().int().positive(),
  publicId: z.string(),
  status: requestStatusSchema,
  answeredCount: z.number().int().nonnegative(),
  unansweredRequiredCount: z.number().int().nonnegative(),
  allRequiredAnswered: z.boolean(),
});

export type SubmitClarificationAnswersMutationInput = z.infer<
  typeof submitClarificationAnswersMutationInputSchema
>;
export type SubmitClarificationAnswersInput = z.infer<typeof submitClarificationAnswersInputSchema>;
export type SubmitClarificationAnswersOutput = z.infer<
  typeof submitClarificationAnswersOutputSchema
>;
