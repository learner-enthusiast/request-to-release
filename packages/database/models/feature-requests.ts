import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  serial,
  pgEnum,
  index,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const requestStatusEnum = pgEnum("request_status", [
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

export const phaseEnum = pgEnum("phase", ["1", "2", "3", "4", "5"]);

export const prdStatusEnum = pgEnum("prd_status", [
  "DRAFT",
  "READY_FOR_REVIEW",
  "APPROVED",
  "IMPLEMENTED",
]);

export const taskStatusEnum = pgEnum("task_status", ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]);

export const issueTypeEnum = pgEnum("issue_type", ["BLOCKING", "NON_BLOCKING"]);

export const reviewStatusEnum = pgEnum("review_status", [
  "PENDING",
  "APPROVED",
  "NEEDS_FIXES",
  "REJECTED",
]);

export const prStatusEnum = pgEnum("pr_status", [
  "DRAFT",
  "OPEN",
  "IN_REVIEW",
  "APPROVED",
  "MERGED",
  "CLOSED",
]);

// ============================================
// TABLES
// ============================================

/**
 * REQUEST: Main entity - Customer's feature request
 * Phase 1 onwards
 */
export const requests = pgTable(
  "requests",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    status: requestStatusEnum("status").notNull().default("NEW"),
    phase: phaseEnum("phase").notNull().default("1"),

    // Customer info
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    customerName: varchar("customer_name", { length: 255 }),
    source: varchar("source", { length: 50 }).notNull(), // 'form', 'email', 'api'
    sourceId: varchar("source_id", { length: 255 }), // external ticket ID if any

    // Priority & context
    priority: varchar("priority", { length: 20 }).default("MEDIUM"), // LOW, MEDIUM, HIGH, URGENT
    deadline: timestamp("deadline"),

    // Approval (Phase 1 gate - happens BEFORE PRD generation)
    approvalRequestedAt: timestamp("approval_requested_at"),
    approvedAt: timestamp("approved_at"),
    approvedBy: text("user_id"), // user_id
    approvalComments: text("approval_comments"),
    rejectionReason: text("rejection_reason"),

    // GitHub linkage (created AFTER approval)
    githubIssueNumber: integer("github_issue_number"),
    githubIssueUrl: varchar("github_issue_url", { length: 500 }),
    githubBranchName: varchar("github_branch_name", { length: 255 }),
    githubRepoSyncId: text("github_repo_sync_id"),

    // Tracking
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdBy: text("user_id"), // user_id if available
  },
  (table) => [
    index("idx_request_status").on(table.status),
    index("idx_request_phase").on(table.phase),
    index("idx_request_customer_email").on(table.customerEmail),
    index("idx_request_github_issue").on(table.githubIssueNumber),
  ],
);

/**
 * CLARIFICATION: Q&A loop during Phase 1
 * Stores customer responses to AI's clarifying questions
 */
export const clarifications = pgTable(
  "clarifications",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull(),

    question: text("question").notNull(),
    answer: text("answer"),
    askedBy: varchar("asked_by", { length: 255 }).default("ai"), // 'ai', 'human'
    answeredBy: text("user_id"), // customer_email or user_id

    isAnswered: boolean("is_answered").default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    answeredAt: timestamp("answered_at"),
    type: varchar("type", { length: 50 }).default("standard"), // "standard" | "feature_education"
    required: boolean("required").default(true),
  },
  (table) => [
    foreignKey({
      columns: [table.requestId],
      foreignColumns: [requests.id],
      name: "fk_clarification_request",
    }).onDelete("cascade"),
    index("idx_clarification_request").on(table.requestId),
    index("idx_clarification_answered").on(table.isAnswered),
  ],
);

/**
 * PRD: Product Requirements Document
 * Generated AFTER request is approved (Phase 1 gate passed)
 * Phase 1 → Phase 2
 */
export const prds = pgTable(
  "prds",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull().unique(),

    // PRD only generated if REQUEST is APPROVED
    // Requires: REQUEST.approvedAt !== null

    // PRD Content
    problemStatement: text("problem_statement"),
    goals: jsonb("goals").$type<string[]>(), // Array of goals
    nonGoals: jsonb("non_goals").$type<string[]>(), // What NOT to build
    userStories: jsonb("user_stories").$type<{ title: string; description: string }[]>(),
    acceptanceCriteria: jsonb("acceptance_criteria").$type<string[]>(),
    edgeCases: jsonb("edge_cases").$type<{ scenario: string; handling: string }[]>(),
    successMetrics: jsonb("success_metrics").$type<{ metric: string; target: string }[]>(),

    // Technical considerations
    nonFunctionalRequirements: jsonb("non_functional_requirements").$type<{
      performance?: string;
      scalability?: string;
      security?: string;
      accessibility?: string;
    }>(),

    // Constraints & Dependencies
    constraints: text("constraints"),
    assumptions: text("assumptions"),
    dependencies: jsonb("dependencies").$type<string[]>(),

    // Storage & versioning
    status: prdStatusEnum("status").notNull().default("DRAFT"),
    fileUrl: varchar("file_url", { length: 500 }), // URL to /docs/prd-{request-id}.md

    // PRD Review & Approval (separate from request approval)
    reviewRequestedAt: timestamp("review_requested_at"),
    approvedAt: timestamp("approved_at"),
    approvedBy: text("user_id"), // user_id who approved PRD
    reviewComments: text("review_comments"),

    // Tracking
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    generatedBy: varchar("generated_by", { length: 255 }).default("ai"), // 'ai' or 'human'
  },
  (table) => [
    foreignKey({
      columns: [table.requestId],
      foreignColumns: [requests.id],
      name: "fk_prd_request",
    }).onDelete("cascade"),
    index("idx_prd_status").on(table.status),
    index("idx_prd_approved").on(table.approvedAt),
  ],
);

/**
 * TASK: Engineering tasks broken down from PRD
 * Created AFTER PRD is approved (Phase 2)
 * Phase 2 → Phase 3
 */
export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    prdId: integer("prd_id").notNull(),

    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    status: taskStatusEnum("status").notNull().default("TODO"),

    // GitHub tracking
    githubIssueNumber: integer("github_issue_number"),
    githubIssueUrl: varchar("github_issue_url", { length: 500 }),

    // Assignment
    assignedTo: text("user_id"), // developer email or user_id

    // Estimation
    estimatedHours: integer("estimated_hours"),
    actualHours: integer("actual_hours"),

    // Ordering / Priority
    order: integer("order"),

    // Dates
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.prdId],
      foreignColumns: [prds.id],
      name: "fk_task_prd",
    }).onDelete("cascade"),
    index("idx_task_prd").on(table.prdId),
    index("idx_task_status").on(table.status),
    index("idx_task_assigned").on(table.assignedTo),
  ],
);
export const requestsRelations = relations(requests, ({ one, many }) => ({
  prd: one(prds, {
    fields: [requests.id],
    references: [prds.requestId],
  }),
  clarifications: many(clarifications),
}));

export const prdsRelations = relations(prds, ({ one, many }) => ({
  request: one(requests, {
    fields: [prds.requestId],
    references: [requests.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  prd: one(prds, {
    fields: [tasks.prdId],
    references: [prds.id],
  }),
}));

export const clarificationsRelations = relations(clarifications, ({ one }) => ({
  request: one(requests, {
    fields: [clarifications.requestId],
    references: [requests.id],
  }),
}));
