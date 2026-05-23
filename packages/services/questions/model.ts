import { z } from "zod";

export const questionTypeModel = z.enum([
  "SHORT_TEXT",
  "LONG_TEXT",
  "MULTIPLE_CHOICE",
  "CHECKBOX",
  "DROPDOWN",
  "RATING",
  "SCALE",
  "YES_NO",
  "EMAIL",
  "PHONE",
  "DATE",
  "FILE_UPLOAD",
  "STATEMENT",
]);
export type QuestionTypeModelType = z.infer<typeof questionTypeModel>;

const choiceItemModel = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const choicesModel = z
  .array(choiceItemModel)
  .min(1)
  .superRefine((choices, ctx) => {
    const ids = choices.map((c) => c.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Choice ids must be unique" });
    }
  });

const multipleChoiceSettingsModel = z.object({
  choices: choicesModel,
  allowOther: z.boolean(),
  randomize: z.boolean(),
  maxSelections: z.number().int().positive().optional(),
});

const dropdownSettingsModel = z.object({
  choices: choicesModel,
  allowOther: z.boolean(),
  placeholder: z.string().optional(),
  searchable: z.boolean(),
});

const ratingSettingsModel = z.object({
  max: z.union([z.literal(5), z.literal(10)]),
  shape: z.enum(["star", "heart", "thumb"]),
});

const scaleSettingsModel = z
  .object({
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    minLabel: z.string().optional(),
    maxLabel: z.string().optional(),
  })
  .refine((v) => v.max > v.min, { message: "SCALE requires max > min" });

const yesNoSettingsModel = z.object({
  yesLabel: z.string().optional(),
  noLabel: z.string().optional(),
});

const fileUploadSettingsModel = z.object({
  maxFileSizeMb: z.number().positive(),
  maxFiles: z.number().int().positive(),
  allowedTypes: z.array(z.string().min(1)).min(1),
});

const dateSettingsModel = z.object({
  format: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  includeTime: z.boolean(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});

const statementSettingsModel = z.object({
  buttonLabel: z.string().optional(),
});

// Shared fields (ownerId is NOT in the public input; take it from ctx.user)
const baseCreateQuestionFields = {
  formId: z.uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable(),
  required: z.boolean().optional(),
};

// Discriminated input (matches your “settings required for some types” rule)
export const createQuestionInputModel = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["SHORT_TEXT", "LONG_TEXT", "EMAIL", "PHONE"]) }).extend({
    ...baseCreateQuestionFields,
    settings: z.undefined().optional(),
  }),

  z.object({ type: z.literal("STATEMENT") }).extend({
    ...baseCreateQuestionFields,
    settings: statementSettingsModel.optional(),
  }),

  z.object({ type: z.literal("YES_NO") }).extend({
    ...baseCreateQuestionFields,
    settings: yesNoSettingsModel.optional(),
  }),

  z.object({ type: z.literal("RATING") }).extend({
    ...baseCreateQuestionFields,
    settings: ratingSettingsModel.optional(),
  }),

  z.object({ type: z.literal("SCALE") }).extend({
    ...baseCreateQuestionFields,
    settings: scaleSettingsModel.optional(),
  }),

  z.object({ type: z.literal("DATE") }).extend({
    ...baseCreateQuestionFields,
    settings: dateSettingsModel.optional(),
  }),

  z.object({ type: z.literal("MULTIPLE_CHOICE") }).extend({
    ...baseCreateQuestionFields,
    settings: multipleChoiceSettingsModel, // required
  }),

  z.object({ type: z.literal("CHECKBOX") }).extend({
    ...baseCreateQuestionFields,
    settings: multipleChoiceSettingsModel, // required
  }),

  z.object({ type: z.literal("DROPDOWN") }).extend({
    ...baseCreateQuestionFields,
    settings: dropdownSettingsModel, // required
  }),

  z.object({ type: z.literal("FILE_UPLOAD") }).extend({
    ...baseCreateQuestionFields,
    settings: fileUploadSettingsModel, // required
  }),
]);
export type CreateQuestionInputModelType = z.infer<typeof createQuestionInputModel>;
export const createQuestionOpenApiInputModel = z.object({
  type: z.enum([
    "SHORT_TEXT",
    "LONG_TEXT",
    "EMAIL",
    "PHONE",
    "STATEMENT",
    "YES_NO",
    "RATING",
    "SCALE",
    "DATE",
    "MULTIPLE_CHOICE",
    "CHECKBOX",
    "DROPDOWN",
    "FILE_UPLOAD",
  ]),

  ...baseCreateQuestionFields,

  // validated later using createQuestionInputModel.parse()
  settings: z.unknown().optional(),
});
export const questionOutputModel = z.object({
  id: z.uuid(),
  formId: z.uuid(),
  order: z.number().int(),
  type: questionTypeModel,
  title: z.string().max(500),
  description: z.string().nullable(),
  required: z.boolean(),
  settings: z.unknown().nullable(),
});
export type QuestionOutputModelType = z.infer<typeof questionOutputModel>;

export const createQuestionOutputModel = questionOutputModel;
export type CreateQuestionOutputModelType = z.infer<typeof createQuestionOutputModel>;
export const updateQuestionInputBaseModel = z.object({
  id: z.uuid().describe("Question id to update"),

  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  required: z.boolean().optional(),

  order: z.number().int().positive().optional(),

  settings: z.unknown().optional(),
});

export const updateQuestionInputModel = updateQuestionInputBaseModel.refine(
  (v) =>
    v.title !== undefined ||
    v.description !== undefined ||
    v.required !== undefined ||
    v.order !== undefined ||
    v.settings !== undefined,
  { message: "Provide at least one field to update" },
);

export type UpdateQuestionInputModelType = z.infer<typeof updateQuestionInputModel>;

export const updateQuestionOutputModel = questionOutputModel;
export type UpdateQuestionOutputModelType = z.infer<typeof updateQuestionOutputModel>;
export const deleteQuestionInputModel = z.object({
  id: z.uuid().describe("Question id to delete"),
});
export type DeleteQuestionInputModelType = z.infer<typeof deleteQuestionInputModel>;

export const deleteQuestionOutputModel = z.object({
  success: z.boolean(),
});
export type DeleteQuestionOutputModelType = z.infer<typeof deleteQuestionOutputModel>;
