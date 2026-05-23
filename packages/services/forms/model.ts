import { z } from "zod";
import { iso } from "zod";
import { questionOutputModel } from "../questions/model";

/**
 * Mirrors `FormSettings` in [packages/database/models/form.ts](packages/database/models/form.ts)
 * Keep this in sync with the DB type.
 */
export const formSettingsModel = z.object({
  theme: z.enum(["light", "dark"]),
  primaryColor: z.string(),
  fontFamily: z.string(),
  backgroundImage: z.string().optional(),
  logoUrl: z.string().optional(),

  showProgressBar: z.boolean(),
  shuffleQuestions: z.boolean(),
  allowMultipleSubmissions: z.boolean(),
  autoSaveDraft: z.boolean(),

  redirectUrl: z.string().optional(),
  thankYouMessage: z.string().optional(),
  showSocialShare: z.boolean(),

  notifyOwnerOnSubmission: z.boolean(),
  notificationEmail: z.email("notification email").optional(),

  maxResponses: z.number().int().positive().optional(),
  closedMessage: z.string().optional(),
});
export type FormSettingsModelType = z.infer<typeof formSettingsModel>;

/**
 * NOTE on timestamps:
 * Your tRPC server does not show a transformer (e.g. superjson).
 * For OpenAPI/JSON safety, model them as ISO strings.
 */
const isoDateTimeString = iso.datetime();

export const formOutputModel = z.object({
  id: z.uuid(),
  title: z.string().max(255),
  description: z.string().nullable(),
  slug: z.string().max(255).nullable(),

  ownerId: z.uuid(),
  published: z.boolean(),

  settings: formSettingsModel.nullable(),

  anonymousResponses: z.boolean(),
  expiry: isoDateTimeString.nullable(),

  createdAt: isoDateTimeString,
  updatedAt: isoDateTimeString.nullable(),
});
export type FormOutputModelType = z.infer<typeof formOutputModel>;

export const successOutputModel = z.object({
  success: z.boolean().describe("Operation result"),
});
export type SuccessOutputModelType = z.infer<typeof successOutputModel>;

/**
 * Create Form
 * Input: title, description
 * Output: created form
 */
export const createFormInputModel = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(10_000).optional().nullable(),
});
export type CreateFormInputModelType = z.infer<typeof createFormInputModel>;

export const createFormOutputModel = formOutputModel;
export type CreateFormOutputModelType = z.infer<typeof createFormOutputModel>;

/**
 * Update Form (patch semantics)
 * Modifiable: title, description, expiry, settings
 */
export const updateFormInputBaseModel = z.object({
  id: z.uuid(),

  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10_000).nullable().optional(),
  expiry: isoDateTimeString.nullable().optional(),

  settings: formSettingsModel.partial().optional(),
});

export const updateFormInputModel = updateFormInputBaseModel.refine(
  (v) =>
    v.title !== undefined ||
    v.description !== undefined ||
    v.expiry !== undefined ||
    v.settings !== undefined,
  { message: "Provide at least one field to update" },
);
export type UpdateFormInputModelType = z.infer<typeof updateFormInputModel>;

export const updateFormOutputModel = formOutputModel;
export type UpdateFormOutputModelType = z.infer<typeof updateFormOutputModel>;

/**
 * Delete Form (owner-only, enforced by auth/ownership check in route/service)
 */
export const deleteFormInputModel = z.object({
  id: z.uuid(),
});
export type DeleteFormInputModelType = z.infer<typeof deleteFormInputModel>;

export const deleteFormOutputModel = successOutputModel;
export type DeleteFormOutputModelType = z.infer<typeof deleteFormOutputModel>;

/**
 * Get Form By Id (owner-only)
 */
export const getFormByIdInputModel = z.object({
  id: z.uuid(),
});
export type GetFormByIdInputModelType = z.infer<typeof getFormByIdInputModel>;

export const getFormByIdOutputModel = formOutputModel;
export type GetFormByIdOutputModelType = z.infer<typeof getFormByIdOutputModel>;

/**
 * Publish Form (owner-only)
 * Output includes link created from slug.
 */
export const publishFormInputModel = z.object({
  id: z.uuid(),
});
export type PublishFormInputModelType = z.infer<typeof publishFormInputModel>;

export const publishFormOutputModel = z.object({
  success: z.boolean(),
  slug: z.string().min(1).max(255),
  link: z.string().min(1),
});
export type PublishFormOutputModelType = z.infer<typeof publishFormOutputModel>;

export const listFormsOwnedByUserInputModel = z.object({
  userId: z.uuid().describe("Owner user id"),
});
export type ListFormsOwnedByUserInputModelType = z.infer<typeof listFormsOwnedByUserInputModel>;

export const listFormsOwnedByUserOutputModel = z.array(formOutputModel);
export type ListFormsOwnedByUserOutputModelType = z.infer<typeof listFormsOwnedByUserOutputModel>;
export const getPublishedFormWithQuestionsBySlugInputModel = z.object({
  slug: z.string().min(1).max(255),
});
export type GetPublishedFormWithQuestionsBySlugInputModelType = z.infer<
  typeof getPublishedFormWithQuestionsBySlugInputModel
>;

// don’t leak ownerId for the public “respondent view”
export const publicFormOutputModel = formOutputModel.omit({ ownerId: true });

export const getPublishedFormWithQuestionsBySlugOutputModel = z.object({
  form: publicFormOutputModel,
  questions: z.array(questionOutputModel),
});
export type GetPublishedFormWithQuestionsBySlugOutputModelType = z.infer<
  typeof getPublishedFormWithQuestionsBySlugOutputModel
>;
