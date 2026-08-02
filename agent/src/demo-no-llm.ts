import { RequestContext } from "@mastra/core/request-context";
import { getAccountantToken } from "./lib/accountant-token";
import { printClaims } from "./lib/decode-jwt";
import { fetchExpenseTool } from "./tools/fetch-expense";
import { approveExpenseTool } from "./tools/approve-expense";

// The same two scenarios as demo.ts, but WITHOUT the LLM: we call the tools
// directly, so the token-cage behaviour is fully visible with no OpenAI key.
// The only thing skipped is the model *deciding* which tool to call.

async function main(): Promise<void> {
  console.log(
    "Obtaining the accountant's broad token from Keycloak (expense-portal)…",
  );
  const accountantToken = await getAccountantToken();
  printClaims(
    "BEFORE — accountant token (broad scope, long-lived)",
    accountantToken,
  );

  // The accountant token rides in the RequestContext — never in a prompt.
  const requestContext = new RequestContext<{ subjectToken: string }>();
  requestContext.set("subjectToken", accountantToken);
  const ctx = { requestContext } as unknown as Parameters<
    NonNullable<typeof fetchExpenseTool.execute>
  >[1];

  console.log("\n" + "=".repeat(72));
  console.log("Scenario 1 — fetch-expense EXP-2517  (expected: API 200)");
  const r1 = await fetchExpenseTool.execute!({ expenseId: "EXP-2517" }, ctx);
  console.log("fetch-expense   ->", JSON.stringify(r1));

  console.log("\n" + "=".repeat(72));
  console.log("Scenario 2 — approve-expense EXP-2517  (expected: API 403)");
  const r2 = await approveExpenseTool.execute!({ expenseId: "EXP-2517" }, ctx);
  console.log("approve-expense ->", JSON.stringify(r2));

  console.log("\n" + "=".repeat(72));
  console.log(
    "Scenario 2 failed at the API with insufficient_scope: the exchanged token",
  );
  console.log(
    "is caged to aud=expense-api / scope=expenses:read and cannot approve or pay.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
