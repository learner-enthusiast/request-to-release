import { pgTable, pgEnum, uuid, varchar, text, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { formsTable } from "./form";

// ─── ENUM ─────────────────────────────────────────────────────────────────────

export const questionTypeEnum = pgEnum("question_type", [
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

// ─── PER-TYPE SETTINGS ────────────────────────────────────────────────────────

type ShortTextSettings = {
  placeholder?: string;
  maxLength?: number;
};

type LongTextSettings = {
  placeholder?: string;
  maxLength?: number;
  rows?: number;
};

type MultipleChoiceSettings = {
  choices: { id: string; label: string }[];
  allowOther: boolean;
  randomize: boolean;
  maxSelections?: number;
};

type DropdownSettings = {
  choices: { id: string; label: string }[];
  allowOther: boolean;
  placeholder?: string;
  searchable: boolean;
};

type RatingSettings = {
  max: 5 | 10;
  shape: "star" | "heart" | "thumb";
};

type ScaleSettings = {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  step: number;
};

type YesNoSettings = {
  yesLabel?: string;
  noLabel?: string;
};

type FileUploadSettings = {
  maxFileSizeMb: number;
  maxFiles: number;
  allowedTypes: string[];
};

type DateSettings = {
  format: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  includeTime: boolean;
  minDate?: string;
  maxDate?: string;
};

type StatementSettings = {
  buttonLabel?: string;
};

type EmailSettings = Record<string, never>;
type PhoneSettings = Record<string, never>;

// ─── DISCRIMINATED UNION ──────────────────────────────────────────────────────

export type QuestionSettings =
  | { type: "SHORT_TEXT"; settings: ShortTextSettings }
  | { type: "LONG_TEXT"; settings: LongTextSettings }
  | { type: "MULTIPLE_CHOICE"; settings: MultipleChoiceSettings }
  | { type: "CHECKBOX"; settings: MultipleChoiceSettings }
  | { type: "DROPDOWN"; settings: DropdownSettings }
  | { type: "RATING"; settings: RatingSettings }
  | { type: "SCALE"; settings: ScaleSettings }
  | { type: "YES_NO"; settings: YesNoSettings }
  | { type: "EMAIL"; settings: EmailSettings }
  | { type: "PHONE"; settings: PhoneSettings }
  | { type: "DATE"; settings: DateSettings }
  | { type: "FILE_UPLOAD"; settings: FileUploadSettings }
  | { type: "STATEMENT"; settings: StatementSettings };

export type SettingsFor<T extends QuestionSettings["type"]> = Extract<
  QuestionSettings,
  { type: T }
>["settings"];

// ─── TABLE ────────────────────────────────────────────────────────────────────

export const questionsTable = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),

  formId: uuid("form_id")
    .notNull()
    .references(() => formsTable.id, { onDelete: "cascade" }),

  order: integer("order").notNull(),
  type: questionTypeEnum("type").notNull(),

  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),

  required: boolean("required").notNull().default(false),

  settings: jsonb("settings").$type<QuestionSettings["settings"]>(),
});

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type SelectQuestion = typeof questionsTable.$inferSelect;
export type InsertQuestion = typeof questionsTable.$inferInsert;
