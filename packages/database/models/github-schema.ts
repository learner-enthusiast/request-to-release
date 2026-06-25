import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const githubInstallation = pgTable(
  "github_installation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    installationId: integer("installation_id").notNull().unique(),
    accountLogin: text("account_login"),
    accountType: text("account_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("github_installation_userId_idx").on(table.userId),
    index("github_installation_installationId_idx").on(table.installationId),
  ],
);

export const pullRequest = pgTable(
  "pull_request",
  {
    id: text("id").primaryKey(),
    installationId: integer("installation_id").notNull(),
    repoFullName: text("repo_full_name").notNull(),
    prNumber: integer("pr_number").notNull(),
    title: text("title").notNull(),
    authorLogin: text("author_login"),
    headSha: text("head_sha").notNull(),
    baseBranch: text("base_branch").notNull(),
    status: text("status").default("pending").notNull(),
    reviewComment: text("review_comment"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("pull_request_repo_pr_unique").on(table.repoFullName, table.prNumber),
    index("pull_request_installationId_idx").on(table.installationId),
    index("pull_request_status_idx").on(table.status),
  ],
);

export const repoSync = pgTable(
  "repo_sync",
  {
    id: text("id").primaryKey(),
    installationId: integer("installation_id").notNull(),
    repoFullName: text("repo_full_name").notNull(),
    branch: text("branch").notNull(),
    status: text("status").default("pending").notNull(),
    chunkCount: integer("chunk_count").default(0).notNull(),
    syncedAt: timestamp("synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("repo_sync_repo_full_name_unique").on(table.repoFullName),
    index("repo_sync_installationId_idx").on(table.installationId),
    index("repo_sync_status_idx").on(table.status),
  ],
);

export const githubInstallationRelations = relations(githubInstallation, ({ one }) => ({
  user: one(user, {
    fields: [githubInstallation.userId],
    references: [user.id],
  }),
}));
