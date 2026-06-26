import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "../env.js";

const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
const REVIEW_MODEL = "anthropic/claude-3.5-sonnet";

const SYSTEM_PROMPT = `You are a senior engineer reviewing a pull request.
Be concise, actionable, and focus on bugs, security, and design issues.`;

type ReviewInput = {
  repoFullName: string;
  title: string;
  contextSnippets: string[];
  repoContextSnippets: string[];
};

function buildRepoContextSection(snippets: string[]) {
  if (snippets.length === 0) return "";
  return `\n\nRelevant codebase context:\n\n${snippets.join("\n\n---\n\n")}`;
}

export async function generateReview(input: ReviewInput) {
  const context = input.contextSnippets.join("\n\n---\n\n");
  const repoContextSection = buildRepoContextSection(input.repoContextSnippets);

  const { text } = await generateText({
    model: openrouter(REVIEW_MODEL),
    system: SYSTEM_PROMPT,
    prompt: `Repository: ${input.repoFullName}
Pull request title: ${input.title}

Code changes:

${context}${repoContextSection}`,
  });

  return text;
}
