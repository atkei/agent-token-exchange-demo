const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8080";
const REALM = process.env.REALM ?? "agents-demo";
const AGENT_CLIENT_ID =
  process.env.EXPENSE_AGENT_CLIENT_ID ?? "expense-agent";
const AGENT_CLIENT_SECRET =
  process.env.EXPENSE_AGENT_CLIENT_SECRET ?? "expense-agent-secret";

const TOKEN_ENDPOINT = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
const ACCESS_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";

export interface ExchangeOptions {
  audience: string;
  scope: string;
}

/**
 * RFC 8693 token exchange.
 *
 * The agent client authenticates itself (client credentials) and presents the
 * accountant's token as the `subject_token`. Keycloak returns a NEW token whose
 * `aud` and `scope` are narrowed to exactly what was requested — never wider
 * than what the agent client is allowed to hold (the "cage").
 */
export async function exchangeToken(
  subjectToken: string,
  { audience, scope }: ExchangeOptions,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: GRANT_TYPE,
    subject_token: subjectToken,
    subject_token_type: ACCESS_TOKEN_TYPE,
    requested_token_type: ACCESS_TOKEN_TYPE,
    audience,
    scope,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization:
        "Basic " +
        Buffer.from(`${AGENT_CLIENT_ID}:${AGENT_CLIENT_SECRET}`).toString(
          "base64",
        ),
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}
