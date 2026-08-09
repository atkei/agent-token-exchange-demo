import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8080";
const REALM = process.env.REALM ?? "agents-demo";
const PORT = Number(process.env.PORT ?? 8787);

const ISSUER = `${KEYCLOAK_URL}/realms/${REALM}`;
const AUDIENCE = "expense-api";

// The resource server never talks to Keycloak except to fetch the signing keys.
// It trusts nothing but a valid signature + the right issuer/audience/scope.
const JWKS = createRemoteJWKSet(
  new URL(`${ISSUER}/protocol/openid-connect/certs`),
);

// Mock data — enough to make the happy path return something real.
const EXPENSES: Record<
  string,
  {
    id: string;
    submittedBy: string;
    purpose: string;
    amount: number;
    currency: string;
    status: string;
  }
> = {
  "EXP-2517": {
    id: "EXP-2517",
    submittedBy: "employee-884",
    purpose: "Client visit — travel and accommodation",
    amount: 48200,
    currency: "JPY",
    status: "Pending approval (1 of 2 approvers signed off)",
  },
};

type Claims = JWTPayload & { scope?: string; azp?: string };

type AuthResult =
  | { ok: true; claims: Claims }
  | {
      ok: false;
      status: 401 | 403;
      body: Record<string, unknown>;
      claims?: Claims;
    };

async function authorize(
  authHeader: string | undefined,
  requiredScope: string,
): Promise<AuthResult> {
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  if (!token)
    return { ok: false, status: 401, body: { error: "missing_token" } };

  let claims: Claims;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    claims = payload as Claims;
  } catch (err) {
    return {
      ok: false,
      status: 401,
      body: { error: "invalid_token", detail: String(err) },
    };
  }

  const scopes = (claims.scope ?? "").split(" ").filter(Boolean);
  if (!scopes.includes(requiredScope)) {
    // This is the whole point of the demo: the caged token simply cannot do this.
    return {
      ok: false,
      status: 403,
      body: {
        error: "insufficient_scope",
        required: requiredScope,
        granted: scopes,
      },
      claims,
    };
  }
  return { ok: true, claims };
}

const app = new Hono();

app.get("/expenses/:id", async (c) => {
  const id = c.req.param("id");
  const auth = await authorize(c.req.header("authorization"), "expenses:read");
  if (!auth.ok) {
    console.log(
      `[api] GET /expenses/${id} -> ${auth.status}`,
      auth.body,
      auth.claims
        ? `(sub=${auth.claims.sub}, azp=${auth.claims.azp})`
        : "",
    );
    return c.json(auth.body, auth.status);
  }
  const expense = EXPENSES[id];
  if (!expense) return c.json({ error: "not_found" }, 404);
  console.log(
    `[api] GET /expenses/${id} -> 200  (sub=${auth.claims.sub}, azp=${auth.claims.azp})`,
  );
  return c.json(expense);
});

app.post("/expenses/:id/approve", async (c) => {
  const id = c.req.param("id");
  const auth = await authorize(
    c.req.header("authorization"),
    "expenses:approve",
  );
  if (!auth.ok) {
    console.log(
      `[api] POST /expenses/${id}/approve -> ${auth.status}`,
      auth.body,
      auth.claims
        ? `(sub=${auth.claims.sub}, azp=${auth.claims.azp})`
        : "",
    );
    return c.json(auth.body, auth.status);
  }
  console.log(
    `[api] POST /expenses/${id}/approve -> 200  (sub=${auth.claims.sub}, azp=${auth.claims.azp})`,
  );
  return c.json({ id, approved: true, paymentScheduled: true });
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(
    `[api] downstream "expense-api" listening on http://localhost:${info.port}`,
  );
  console.log(`[api] verifying: issuer=${ISSUER}  audience="${AUDIENCE}"`);
});
