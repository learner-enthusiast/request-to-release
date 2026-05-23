import { and, db, eq, inArray, sql } from "@repo/database";
import { formsTable } from "@repo/database/models/form";
import { questionsTable, type SelectQuestion } from "@repo/database/models/question";
import { formResponsesTable } from "@repo/database/models/formresponse";
import { answersTable } from "@repo/database/models/answer";

import type {
  ListResponsesByFormIdInputModelType,
  ListResponsesByFormIdOutputModelType,
  SubmitFormResponseInputModelType,
  SubmitFormResponseOutputModelType,
} from "./model";

class InvalidAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAnswerError";
  }
}
class FormNotAcceptingAnonymousResponsesError extends Error {
  constructor() {
    super("This form does not accept anonymous responses");
    this.name = "FormNotAcceptingAnonymousResponsesError";
  }
}
class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required to submit response");
    this.name = "AuthenticationRequiredError";
  }
}
class FormUnavailableError extends Error {
  constructor() {
    super("Form not found");
    this.name = "FormUnavailableError";
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}
function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

function getChoices(settings: unknown): string[] {
  const s = settings as any;
  const choices = Array.isArray(s?.choices) ? s.choices : [];
  return choices.map((c: any) => c?.id).filter((id: any) => typeof id === "string");
}

function validateAnswerForQuestion(question: SelectQuestion, value: unknown) {
  const settings = question.settings as any;

  switch (question.type) {
    case "SHORT_TEXT":
    case "LONG_TEXT": {
      if (value === null || value === undefined) return;
      if (!isNonEmptyString(value)) throw new InvalidAnswerError("Text answer must be a string");
      return;
    }

    case "EMAIL": {
      if (value === null || value === undefined) return;
      if (!isNonEmptyString(value)) throw new InvalidAnswerError("Email must be a string");
      // minimal email check (you can tighten later)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        throw new InvalidAnswerError("Invalid email");
      }
      return;
    }

    case "PHONE": {
      if (value === null || value === undefined) return;
      if (!isNonEmptyString(value)) throw new InvalidAnswerError("Phone must be a string");
      if (!/^[0-9+\-() ]{6,}$/.test(value.trim())) {
        throw new InvalidAnswerError("Invalid phone number");
      }
      return;
    }

    case "YES_NO": {
      if (!isBoolean(value)) throw new InvalidAnswerError("YES_NO answer must be boolean");
      return;
    }

    case "RATING": {
      const max = (settings?.max ?? 5) as number;
      if (!isNumber(value) || !Number.isInteger(value)) {
        throw new InvalidAnswerError("RATING answer must be an integer");
      }
      if (value < 1 || value > max) {
        throw new InvalidAnswerError(`RATING must be between 1 and ${max}`);
      }
      return;
    }

    case "SCALE": {
      const min = (settings?.min ?? 1) as number;
      const max = (settings?.max ?? 10) as number;
      const step = (settings?.step ?? 1) as number;

      if (!isNumber(value)) throw new InvalidAnswerError("SCALE answer must be a number");
      if (value < min || value > max) throw new InvalidAnswerError(`SCALE must be ${min}..${max}`);

      const offset = value - min;
      if (Math.abs(offset / step - Math.round(offset / step)) > 1e-9) {
        throw new InvalidAnswerError("SCALE answer does not match step");
      }
      return;
    }

    case "DATE": {
      if (!isNonEmptyString(value)) throw new InvalidAnswerError("DATE answer must be a string");
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) throw new InvalidAnswerError("Invalid DATE value");

      if (settings?.minDate) {
        const min = new Date(settings.minDate);
        if (!Number.isNaN(min.getTime()) && d < min) throw new InvalidAnswerError("DATE < minDate");
      }
      if (settings?.maxDate) {
        const max = new Date(settings.maxDate);
        if (!Number.isNaN(max.getTime()) && d > max) throw new InvalidAnswerError("DATE > maxDate");
      }
      return;
    }

    case "MULTIPLE_CHOICE":
    case "DROPDOWN": {
      if (!isNonEmptyString(value)) throw new InvalidAnswerError("Choice answer must be a string");
      const allowed = getChoices(settings);
      if (!allowed.includes(value)) {
        throw new InvalidAnswerError("Answer is not in allowed choices");
      }
      return;
    }

    case "CHECKBOX": {
      if (!Array.isArray(value)) throw new InvalidAnswerError("CHECKBOX answer must be an array");
      const selected = value;
      if (!selected.every(isNonEmptyString)) {
        throw new InvalidAnswerError("CHECKBOX values must be string choice ids");
      }
      if (new Set(selected).size !== selected.length) {
        throw new InvalidAnswerError("CHECKBOX values must be unique");
      }

      const allowed = getChoices(settings);
      const invalid = selected.find((id) => !allowed.includes(id));
      if (invalid) throw new InvalidAnswerError("CHECKBOX contains invalid choice");

      const maxSelections = settings?.maxSelections as number | undefined;
      if (maxSelections !== undefined && selected.length > maxSelections) {
        throw new InvalidAnswerError("Too many selections");
      }
      return;
    }

    case "FILE_UPLOAD": {
      // Expect: { files: [{ url, mimeType, sizeMb }] }
      const v = value as any;
      const files = Array.isArray(v?.files) ? v.files : null;
      if (!files) throw new InvalidAnswerError("FILE_UPLOAD answer must be { files: [...] }");

      const maxFiles = settings?.maxFiles as number | undefined;
      const maxFileSizeMb = settings?.maxFileSizeMb as number | undefined;
      const allowedTypes = Array.isArray(settings?.allowedTypes) ? settings.allowedTypes : [];

      if (maxFiles !== undefined && files.length > maxFiles) {
        throw new InvalidAnswerError("Too many uploaded files");
      }

      for (const f of files) {
        if (!isNonEmptyString(f?.url)) throw new InvalidAnswerError("Invalid file url");
        if (!isNonEmptyString(f?.mimeType)) throw new InvalidAnswerError("Invalid mimeType");
        if (!isNumber(f?.sizeMb) || f.sizeMb <= 0) throw new InvalidAnswerError("Invalid sizeMb");

        if (maxFileSizeMb !== undefined && f.sizeMb > maxFileSizeMb) {
          throw new InvalidAnswerError("File too large");
        }
        if (allowedTypes.length > 0 && !allowedTypes.includes(f.mimeType)) {
          throw new InvalidAnswerError("Disallowed file type");
        }
      }
      return;
    }

    case "STATEMENT": {
      // usually no answer required; if present, accept boolean true
      if (value === null || value === undefined) return;
      if (value !== true) throw new InvalidAnswerError("STATEMENT answer must be true");
      return;
    }
  }
}

class FormResponseService {
  public async submitResponseForFormSlug(params: {
    respondentId: string | null;
    input: SubmitFormResponseInputModelType;
    requireAnonymous: boolean;
    requireAuthenticated: boolean;
  }): Promise<SubmitFormResponseOutputModelType> {
    const { respondentId, input, requireAnonymous, requireAuthenticated } = params;

    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.slug, input.formSlug))
      .limit(1);

    if (!form || !form.published) throw new FormUnavailableError();
    if (form.expiry && form.expiry.getTime() <= Date.now()) throw new FormUnavailableError();

    if (requireAuthenticated && !respondentId) throw new AuthenticationRequiredError();
    if (requireAnonymous && !form.anonymousResponses) {
      throw new FormNotAcceptingAnonymousResponsesError();
    }
    if (!form.anonymousResponses && !respondentId) {
      // non-anonymous form always requires auth
      throw new AuthenticationRequiredError();
    }

    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.formId, form.id));

    const questionById = new Map(questions.map((q) => [q.id, q]));

    // Validate: answers only for questions in this form
    for (const a of input.answers) {
      const q = questionById.get(a.questionId);
      if (!q) throw new InvalidAnswerError("Answer references an invalid question");
      validateAnswerForQuestion(q, a.value);
    }

    // Validate: required questions answered
    const answered = new Set(input.answers.map((a) => a.questionId));
    for (const q of questions) {
      if (!q.required) continue;

      if (!answered.has(q.id)) {
        throw new InvalidAnswerError(`Missing required answer for question ${q.id}`);
      }

      // required + “empty” protection for some types
      const a = input.answers.find((x) => x.questionId === q.id)!;
      if (
        (q.type === "SHORT_TEXT" ||
          q.type === "LONG_TEXT" ||
          q.type === "EMAIL" ||
          q.type === "PHONE") &&
        !isNonEmptyString(a.value)
      ) {
        throw new InvalidAnswerError("Required text answer cannot be empty");
      }
      if (q.type === "CHECKBOX" && (!Array.isArray(a.value) || a.value.length === 0)) {
        throw new InvalidAnswerError("Required checkbox must have at least one selection");
      }
    }

    return db.transaction(async (tx) => {
      const [response] = await tx
        .insert(formResponsesTable)
        .values({
          formId: form.id,
          respondentId,
          name: input.name,
          metadata: input.metadata,
          completedAt: new Date(),
        })
        .returning({ id: formResponsesTable.id });

      if (!response?.id) throw new Error("Response not created");

      if (input.answers.length > 0) {
        await tx.insert(answersTable).values(
          input.answers.map((a) => ({
            responseId: response.id,
            questionId: a.questionId,
            value: a.value,
          })),
        );
      }

      return { success: true, responseId: response.id };
    });
  }
  private async assertFormOwnership(formId: string, ownerId: string): Promise<void> {
    const [form] = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), eq(formsTable.ownerId, ownerId)))
      .limit(1);

    if (!form) throw new Error("Form not found");
  }

  private toQuestionOutput(q: SelectQuestion) {
    return {
      id: q.id,
      formId: q.formId,
      order: q.order,
      type: q.type,
      title: q.title,
      description: q.description ?? null,
      required: q.required,
      settings: q.settings ?? null,
    };
  }

  public async listResponsesWithAnswersForOwnedForm(
    ownerId: string,
    input: ListResponsesByFormIdInputModelType,
  ): Promise<ListResponsesByFormIdOutputModelType> {
    const { formId } = input;

    await this.assertFormOwnership(formId, ownerId);

    const responses = await db
      .select()
      .from(formResponsesTable)
      .where(eq(formResponsesTable.formId, formId));

    if (responses.length === 0) return [];

    const responseIds = responses.map((r) => r.id);

    const answers = await db
      .select()
      .from(answersTable)
      .where(inArray(answersTable.responseId, responseIds));

    const questionIds = Array.from(new Set(answers.map((a) => a.questionId)));

    const questions = questionIds.length
      ? await db.select().from(questionsTable).where(inArray(questionsTable.id, questionIds))
      : [];

    const questionById = new Map(questions.map((q) => [q.id, q]));

    const answersByResponseId = new Map<string, typeof answers>();
    for (const a of answers) {
      const arr = answersByResponseId.get(a.responseId) ?? [];
      arr.push(a);
      answersByResponseId.set(a.responseId, arr);
    }

    return responses.map((r) => {
      const respAnswers = answersByResponseId.get(r.id) ?? [];

      return {
        id: r.id,
        formId: r.formId,
        name: r.name ?? null,
        respondentId: r.respondentId ?? null,
        metadata: (r.metadata as unknown) ?? null,
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        answers: respAnswers.map((a) => {
          const q = questionById.get(a.questionId);
          if (!q) throw new Error("Question missing for an answer");

          return {
            id: a.id,
            responseId: a.responseId,
            questionId: a.questionId,
            value: a.value,
            createdAt: a.createdAt.toISOString(),
            question: this.toQuestionOutput(q),
          };
        }),
      };
    });
  }
}

export default FormResponseService;
