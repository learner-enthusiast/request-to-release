import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
export type FormSettings = {
  // ─── APPEARANCE ───────────────────────────────────────────────
  theme: "light" | "dark";
  primaryColor: string; // hex e.g. "#6C47FF"
  fontFamily: string; // e.g. "Inter", "DM Sans"
  backgroundImage?: string; // URL
  logoUrl?: string; // shown on form header

  // ─── BEHAVIOR ─────────────────────────────────────────────────
  showProgressBar: boolean;
  shuffleQuestions: boolean;
  allowMultipleSubmissions: boolean;
  autoSaveDraft: boolean; // save partial responses

  // ─── COMPLETION ───────────────────────────────────────────────
  redirectUrl?: string; // redirect after submit
  thankYouMessage?: string; // shown on completion screen
  showSocialShare: boolean; // share buttons on completion

  // ─── NOTIFICATIONS ────────────────────────────────────────────
  notifyOwnerOnSubmission: boolean;
  notificationEmail?: string; // defaults to owner email if not set

  // ─── LIMITS ───────────────────────────────────────────────────
  maxResponses?: number; // close form after N submissions
  closedMessage?: string; // shown when form is closed/expired
};
export const defaultFormSettings: FormSettings = {
  theme: "light",
  primaryColor: "#6C47FF",
  fontFamily: "DM Sans",
  showProgressBar: true,
  shuffleQuestions: false,
  allowMultipleSubmissions: false,
  autoSaveDraft: true,
  showSocialShare: false,
  notifyOwnerOnSubmission: true,
  thankYouMessage: "Thanks for your response! 🎉",
};
export const formsTable = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),

  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),

  slug: varchar("slug", { length: 255 }).unique(),

  ownerId: uuid("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  published: boolean("published").notNull().default(false),

  settings: jsonb("settings").$type<FormSettings>().default(defaultFormSettings),

  anonymousResponses: boolean("anonymous_responses").notNull().default(false),
  expiry: timestamp("expiry"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type SelectForm = typeof formsTable.$inferSelect;
export type InsertForm = typeof formsTable.$inferInsert;
