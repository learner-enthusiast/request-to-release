import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { env } from "../env.js";

const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
const MODEL = "openrouter/free";

const initialDecisionSchema = z.object({
  path: z.enum(["clear", "clarify", "exists"]),
  reasoning: z.string(),
  questions: z
    .array(
      z.object({
        text: z.string(),
        required: z.boolean().default(true),
      }),
    )
    .max(7)
    .optional(),
  existingFeature: z
    .object({
      name: z.string(),
      summary: z.string(),
      docLinks: z.array(z.string()).default([]),
    })
    .optional(),
  summary: z.string().optional(),
});

const reviewDecisionSchema = z.object({
  outcome: z.enum(["more_questions", "ready_for_summary", "ready_for_team"]),
  reasoning: z.string(),
  questions: z
    .array(
      z.object({
        text: z.string(),
        required: z.boolean().default(true),
      }),
    )
    .max(5)
    .optional(),
  summary: z.string().optional(),
});

type RequestContext = {
  title: string;
  description: string;
  repoSnippets: string[];
  qaHistory: string;
  extraContext?: string;
};

function formatPrompt(ctx: RequestContext) {
  const repoSection =
    ctx.repoSnippets.length > 0
      ? `\n\nRelevant codebase snippets:\n${ctx.repoSnippets.join("\n\n---\n\n")}`
      : "\n\n(No synced repo context available.)";

  const qaSection = ctx.qaHistory ? `\n\nClarification Q&A so far:\n${ctx.qaHistory}` : "";

  const extra = ctx.extraContext ? `\n\nAdditional context:\n${ctx.extraContext}` : "";

  return `Feature request title: ${ctx.title}
Description: ${ctx.description}${qaSection}${extra}${repoSection}`;
}

const INITIAL_SYSTEM = `You are ShipFlow's product discovery AI.
Decide ONE path:
- "exists": strong evidence the product/codebase already covers this (cite repo snippets).
- "clarify": scope is unclear; ask 3-7 specific follow-up questions.
- "clear": enough detail; provide a concise "summary" of understood scope for user approval.
Be conservative with "exists" — only use when repo evidence is strong.`;

const REVIEW_SYSTEM = `You review customer answers to clarification questions.
Decide ONE outcome:
- "more_questions": answers unclear or scope still ambiguous (ask 1-5 targeted questions).
- "ready_for_summary": enough info; write a concise scope summary for user approval.
- "ready_for_team": exceptionally clear; can skip summary and go straight to human team review.`;

export async function runInitialClarifyDecision(ctx: RequestContext) {
  const { object } = await generateObject({
    model: openrouter(MODEL),
    schema: initialDecisionSchema,
    system: INITIAL_SYSTEM,
    prompt: formatPrompt(ctx),
  });
  return object;
}

export async function runReviewClarificationsDecision(ctx: RequestContext) {
  const { object } = await generateObject({
    model: openrouter(MODEL),
    schema: reviewDecisionSchema,
    system: REVIEW_SYSTEM,
    prompt: formatPrompt(ctx),
  });
  return object;
}
