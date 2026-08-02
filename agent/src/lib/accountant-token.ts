const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8080";
const REALM = process.env.REALM ?? "agents-demo";
const EXPENSE_PORTAL_CLIENT_ID =
  process.env.EXPENSE_PORTAL_CLIENT_ID ?? "expense-portal";
const ACCOUNTANT_USERNAME = process.env.ACCOUNTANT_USERNAME ?? "accountant-123";
const ACCOUNTANT_PASSWORD = process.env.ACCOUNTANT_PASSWORD ?? "password";

// Stands in for the accountant logging into the expense portal in a browser.
export async function getAccountantToken(): Promise<string> {
  const res = await fetch(
    `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: EXPENSE_PORTAL_CLIENT_ID,
        username: ACCOUNTANT_USERNAME,
        password: ACCOUNTANT_PASSWORD,
      }),
    },
  );
  if (!res.ok)
    throw new Error(
      `accountant login failed: ${res.status} ${await res.text()}`,
    );
  return ((await res.json()) as { access_token: string }).access_token;
}
