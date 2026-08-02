import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { exchangeToken } from "../lib/token-exchange";
import { printClaims } from "../lib/decode-jwt";

const EXPENSE_API_URL = process.env.EXPENSE_API_URL ?? "http://localhost:8787";

export const fetchExpenseTool = createTool({
  id: "fetch-expense",
  description:
    "Look up an expense report by its ID, including its approval status.",
  inputSchema: z.object({
    expenseId: z.string().describe("Expense report ID, e.g. EXP-2517"),
  }),
  execute: async (inputData, context) => {
    // The subject token is read from the RequestContext, NOT from the prompt,
    // so it never enters the LLM's context window.
    const subjectToken = context?.requestContext?.get("subjectToken") as
      | string
      | undefined;
    if (!subjectToken) throw new Error("no subjectToken in request context");

    // Narrow to exactly what this tool needs. This is the whole point.
    const token = await exchangeToken(subjectToken, {
      audience: "expense-api",
      scope: "expenses:read",
    });
    printClaims(
      "AFTER — exchanged token (expense-agent → expense-api, expenses:read)",
      token,
    );

    const res = await fetch(
      `${EXPENSE_API_URL}/expenses/${inputData.expenseId}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const text = await res.text();
    // Print the raw status here: the agent's own reply is natural language, so
    // this is what makes the 200/403 visible in the agent's terminal.
    console.log(
      `[agent] GET /expenses/${inputData.expenseId} → HTTP ${res.status}${res.ok ? "" : ` ${text}`}`,
    );
    if (!res.ok) return { httpStatus: res.status, error: text };
    return { httpStatus: res.status, expense: JSON.parse(text) };
  },
});
