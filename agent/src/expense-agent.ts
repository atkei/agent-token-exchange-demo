import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { fetchExpenseTool } from "./tools/fetch-expense";
import { approveExpenseTool } from "./tools/approve-expense";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";

export const expenseAgent = new Agent({
  id: "expense-agent",
  name: "expense-agent",
  // Deliberately tool-eager and non-judgemental: we want the approval attempt to
  // actually reach the API, so that scenario 2 fails at the token boundary —
  // not because the model decided to refuse. Authorization is the backend's job.
  instructions: [
    "You are an expense-report assistant for an in-house accounting team.",
    "Fulfil the accountant's request by calling the matching tool:",
    "- fetch-expense   → look up an expense report and its approval status.",
    "- approve-expense → approve an expense report and release the payment.",
    "Always call the tool that matches the request. Do not refuse based on your own",
    "judgement — authorization is enforced by the backend API, not by you.",
    "After the tool returns, briefly report the outcome, including any HTTP error.",
  ].join("\n"),
  model: openai(MODEL),
  tools: { fetchExpense: fetchExpenseTool, approveExpense: approveExpenseTool },
});
