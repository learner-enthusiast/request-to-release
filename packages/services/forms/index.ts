import { randomBytes } from "node:crypto";
import { and, asc, db, eq } from "@repo/database";
import { formsTable, defaultFormSettings, type FormSettings } from "@repo/database/models/form";
import type { SelectForm } from "@repo/database/models/form";

import type {
  CreateFormInputModelType,
  CreateFormOutputModelType,
  UpdateFormInputModelType,
  UpdateFormOutputModelType,
  DeleteFormInputModelType,
  DeleteFormOutputModelType,
  GetFormByIdInputModelType,
  GetFormByIdOutputModelType,
  PublishFormInputModelType,
  PublishFormOutputModelType,
  FormOutputModelType,
  FormSettingsModelType,
  ListFormsOwnedByUserInputModelType,
  ListFormsOwnedByUserOutputModelType,
  GetPublishedFormWithQuestionsBySlugInputModelType,
  GetPublishedFormWithQuestionsBySlugOutputModelType,
} from "./model";
import { questionsTable, SelectQuestion } from "@repo/database/models/question";

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function parseOptionalIsoToDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined; // not provided => unchanged
  if (value === null) return null; // explicitly clear
  return new Date(value);
}

function slugifyTitle(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (base.length > 0 ? base : "form").slice(0, 60);
}

function buildSlugFromIdAndTitle(id: string, title: string) {
  const idPart = id.replace(/-/g, "").slice(0, 10); // stable + unique enough
  return `${slugifyTitle(title)}-${idPart}`.slice(0, 255);
}

class FormService {
  private toFormOutput(row: SelectForm): FormOutputModelType {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      slug: row.slug ?? null,

      ownerId: row.ownerId,
      published: row.published,

      settings: (row.settings as FormSettings) ?? null,

      anonymousResponses: row.anonymousResponses,
      expiry: toIso(row.expiry),

      createdAt: row.createdAt.toISOString(),
      updatedAt: toIso(row.updatedAt),
    };
  }

  private async getOwnedFormOrThrow(formId: string, ownerId: string) {
    const rows = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), eq(formsTable.ownerId, ownerId)));

    const form = rows[0];
    if (!form) throw new Error("Form not found");
    return form;
  }

  public async createDraftFormForOwner(
    payload: { ownerId: string } & CreateFormInputModelType,
  ): Promise<CreateFormOutputModelType> {
    const { ownerId, title, description } = payload;

    return db.transaction(async (tx) => {
      // If your DB has `slug NOT NULL`, you must insert *something* first.
      const temporarySlug = `tmp-${randomBytes(8).toString("hex")}`.slice(0, 255);

      const inserted = await tx
        .insert(formsTable)
        .values({
          ownerId,
          title,
          description: description ?? null,
          slug: temporarySlug,
          published: false,
        })
        .returning();

      const created = inserted[0];
      if (!created) throw new Error("Form not created");

      const finalSlug = buildSlugFromIdAndTitle(created.id, created.title);

      const updated = await tx
        .update(formsTable)
        .set({ slug: finalSlug })
        .where(and(eq(formsTable.id, created.id), eq(formsTable.ownerId, ownerId)))
        .returning();

      const row = updated[0];
      if (!row) throw new Error("Failed to set slug");

      return this.toFormOutput(row);
    });
  }

  public async patchOwnedFormConfiguration(
    payload: {
      ownerId: string;
    } & UpdateFormInputModelType,
  ): Promise<UpdateFormOutputModelType> {
    const { ownerId, id, title, description, expiry, settings } = payload;

    const existing = await this.getOwnedFormOrThrow(id, ownerId);

    const expiryDate = parseOptionalIsoToDate(expiry);

    let mergedSettings: FormSettings | undefined;
    if (settings !== undefined) {
      const current = (existing.settings as FormSettings | null) ?? defaultFormSettings;

      mergedSettings = {
        ...defaultFormSettings,
        ...current,
        ...(settings as FormSettingsModelType),
      };
    }

    const updated = await db
      .update(formsTable)
      .set({
        title: title ?? undefined,
        description: description ?? undefined,
        expiry: expiryDate,
        settings: mergedSettings,
      })
      .where(and(eq(formsTable.id, id), eq(formsTable.ownerId, ownerId)))
      .returning();

    const row = updated[0];
    if (!row) throw new Error("Form not found");

    return this.toFormOutput(row);
  }

  public async deleteOwnedForm(
    payload: {
      ownerId: string;
    } & DeleteFormInputModelType,
  ): Promise<DeleteFormOutputModelType> {
    const { ownerId, id } = payload;

    const deleted = await db
      .delete(formsTable)
      .where(and(eq(formsTable.id, id), eq(formsTable.ownerId, ownerId)))
      .returning({ id: formsTable.id });

    if (!deleted[0]?.id) throw new Error("Form not found");

    return { success: true };
  }

  public async getOwnedFormById(
    payload: {
      ownerId: string;
    } & GetFormByIdInputModelType,
  ): Promise<GetFormByIdOutputModelType> {
    const { ownerId, id } = payload;
    const row = await this.getOwnedFormOrThrow(id, ownerId);
    return this.toFormOutput(row);
  }

  public async publishOwnedFormAndGetShareLink(
    payload: {
      ownerId: string;
    } & PublishFormInputModelType,
  ): Promise<PublishFormOutputModelType> {
    const { ownerId, id } = payload;

    const existing = await this.getOwnedFormOrThrow(id, ownerId);

    const slugToUse = existing.slug;

    const updated = await db
      .update(formsTable)
      .set({
        published: true,
        slug: slugToUse,
      })
      .where(and(eq(formsTable.id, id), eq(formsTable.ownerId, ownerId)))
      .returning({ slug: formsTable.slug });

    const slug = updated[0]?.slug;
    if (!slug) throw new Error("Publish failed");

    // Assumption: the public form URL is `/forms/:slug`
    // If you want a different path (e.g. `/f/:slug`), change this string.
    return { success: true, slug, link: `/forms/${slug}` };
  }
  public async listFormsOwnedByUser(
    payload: ListFormsOwnedByUserInputModelType,
  ): Promise<ListFormsOwnedByUserOutputModelType> {
    const { userId } = payload;

    const rows = await db.select().from(formsTable).where(eq(formsTable.ownerId, userId));

    return rows.map((row) => this.toFormOutput(row));
  }
  private toPublicFormOutput(row: SelectForm) {
    const out = this.toFormOutput(row);
    // omit ownerId for public endpoint
    const { ownerId: _ownerId, ...publicOut } = out;
    return publicOut;
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

  public async getPublishedFormWithQuestionsBySlug(
    input: GetPublishedFormWithQuestionsBySlugInputModelType,
  ): Promise<GetPublishedFormWithQuestionsBySlugOutputModelType> {
    const { slug } = input;

    const [form] = await db.select().from(formsTable).where(eq(formsTable.slug, slug)).limit(1);

    // Don’t leak whether draft forms exist
    if (!form || !form.published) throw new Error("Form not found");

    if (form.expiry && form.expiry.getTime() <= Date.now()) {
      throw new Error("Form expired");
    }

    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.formId, form.id))
      .orderBy(asc(questionsTable.order));

    return {
      form: this.toPublicFormOutput(form),
      questions: questions.map((q) => this.toQuestionOutput(q)),
    };
  }
}

export default FormService;
