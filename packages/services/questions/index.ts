import { and, db, eq, sql } from "@repo/database";
import { formsTable } from "@repo/database/models/form";
import {
  questionsTable,
  type InsertQuestion,
  type SelectQuestion,
} from "@repo/database/models/question";

import {
  createQuestionInputModel,
  DeleteQuestionInputModelType,
  DeleteQuestionOutputModelType,
  UpdateQuestionInputModelType,
  UpdateQuestionOutputModelType,
  type CreateQuestionInputModelType,
  type CreateQuestionOutputModelType,
} from "./model";
import {
  FormNotFoundError,
  InvalidQuestionError,
  QuestionNotCreatedError,
  resolveSettings,
  toOutput,
  validateQuestionInput,
} from "./utils";

// ─── ERRORS ───────────────────────────────────────────────────────────────────

// ─── SERVICE ──────────────────────────────────────────────────────────────────

class QuestionService {
  private async assertFormOwnership(formId: string, ownerId: string): Promise<void> {
    const [form] = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), eq(formsTable.ownerId, ownerId)))
      .limit(1);

    if (!form) throw new FormNotFoundError();
  }

  private async getNextOrder(formId: string): Promise<number> {
    const [row] = await db
      .select({
        maxOrder: sql<number>`coalesce(max(${questionsTable.order}), 0)`,
      })
      .from(questionsTable)
      .where(eq(questionsTable.formId, formId));

    return (row?.maxOrder ?? 0) + 1;
  }

  public async createQuestionOnOwnedForm(
    ownerId: string,
    input: CreateQuestionInputModelType,
  ): Promise<CreateQuestionOutputModelType> {
    const { formId, type, title, description, required } = input;

    // 1. ownership
    await this.assertFormOwnership(formId, ownerId);

    // 2. semantic edge case validation
    validateQuestionInput(input);

    // 3. order + settings in parallel
    const [order, settings] = await Promise.all([
      this.getNextOrder(formId),
      Promise.resolve(resolveSettings(input)),
    ]);

    // 4. insert
    const [question] = await db
      .insert(questionsTable)
      .values({
        formId,
        order,
        type,
        title,
        description: description ?? null,
        required: required ?? false,
        settings,
      } satisfies InsertQuestion)
      .returning();

    if (!question) throw new QuestionNotCreatedError();

    return toOutput(question);
  }
  public async updateQuestionOnOwnedForm(
    ownerId: string,
    input: UpdateQuestionInputModelType,
  ): Promise<UpdateQuestionOutputModelType> {
    const { id } = input;

    const [existing] = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.id, id))
      .limit(1);

    if (!existing) {
      // better: introduce QuestionNotFoundError in utils.ts
      throw new InvalidQuestionError("Question not found");
    }

    // ownership is based on the question's formId (formId is not modifiable)
    await this.assertFormOwnership(existing.formId, ownerId);

    // Build update patch (only changed fields)
    const patch: Partial<InsertQuestion> = {};

    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description; // can be null
    if (input.required !== undefined) patch.required = input.required;
    if (input.order !== undefined) patch.order = input.order;

    // Validate edge cases ONLY if settings is being changed
    if (input.settings !== undefined) {
      // create-like object so we can reuse create validators
      const candidate = createQuestionInputModel.parse({
        formId: existing.formId,
        type: existing.type, // type is NOT modifiable, we take from DB
        title: input.title ?? existing.title,
        description:
          input.description !== undefined ? input.description : (existing.description ?? null),
        required: input.required ?? existing.required,

        // settings comes from PATCH payload
        settings: input.settings,
      } as unknown);

      validateQuestionInput(candidate);
      patch.settings = resolveSettings(candidate);
    }

    const [updated] = await db
      .update(questionsTable)
      .set(patch)
      .where(eq(questionsTable.id, id))
      .returning();

    if (!updated) throw new InvalidQuestionError("Question could not be updated");

    return toOutput(updated);
  }
  public async deleteQuestionFromOwnedForm(
    ownerId: string,
    input: DeleteQuestionInputModelType,
  ): Promise<DeleteQuestionOutputModelType> {
    const { id } = input;

    const [existing] = await db
      .select({ id: questionsTable.id, formId: questionsTable.formId })
      .from(questionsTable)
      .where(eq(questionsTable.id, id))
      .limit(1);

    if (!existing) throw new InvalidQuestionError("Question not found");

    // ownership check via the question's formId
    await this.assertFormOwnership(existing.formId, ownerId);

    const [deleted] = await db
      .delete(questionsTable)
      .where(eq(questionsTable.id, id))
      .returning({ id: questionsTable.id });

    if (!deleted?.id) throw new InvalidQuestionError("Question could not be deleted");

    return { success: true };
  }
}

export default QuestionService;
