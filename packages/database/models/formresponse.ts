import { pgTable, uuid, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { formsTable } from "./form";
import { usersTable } from "./user";

export const formResponsesTable = pgTable("form_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 80 }),

  formId: uuid("form_id")
    .notNull()
    .references(() => formsTable.id, { onDelete: "cascade" }),

  respondentId: uuid("respondent_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),

  metadata: jsonb("metadata"),

  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SelectFormResponse = typeof formResponsesTable.$inferSelect;
export type InsertFormResponse = typeof formResponsesTable.$inferInsert;
