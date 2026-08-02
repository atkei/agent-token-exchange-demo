import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { exchangeToken } from "../lib/token-exchange";
import { printClaims } from "../lib/decode-jwt";

const EXPENSE_API_URL = process.env.EXPENSE_API_URL ?? "http://localhost:8787";

export const approveExpenseTool = createTool({
  id: "approve-expense",
  description:
    "Approve an expense report by its ID and release it for payment.",
  inputSchema: z.object({
    expenseId: z.string().describe("Expense report ID, e.g. EXP-2517"),
  }),
  execute: async (inputData, context) => {
    const subjectToken = context?.requestContext?.get("subjectToken") as
      | string
      | undefined;
    if (!subjectToken) throw new Error("no subjectToken in request context");

    // The agent can ONLY ever obtain an expenses:read token — the cage holds even
    // here. It will call the approve endpoint with a token that lacks
    // expenses:approve.
    const token = await exchangeToken(subjectToken, {
      audience: "expense-api",
      scope: "expenses:read",
    });
    printClaims(
      "AFTER — exchanged token (expense-agent → expense-api, still expenses:read)",
      token,
    );

    const res = await fetch(
      `${EXPENSE_API_URL}/expenses/${inputData.expenseId}/approve`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      },
    );
    const text = await res.text();
    // Print the raw status here: the agent's own reply is natural language, so
    // this is what makes the 200/403 visible in the agent's terminal.
    console.log(
      `[agent] POST /expenses/${inputData.expenseId}/approve → HTTP ${res.status}${res.ok ? "" : ` ${text}`}`,
    );
    if (!res.ok) return { httpStatus: res.status, error: text };
    return { httpStatus: res.status, result: JSON.parse(text) };
  },
});
