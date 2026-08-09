// Decode a JWT payload without verifying it — for display only.
export function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString());
}

// Pretty-print the claims that matter for this demo, so the "before" and
// "after" tokens can be compared side by side in the terminal.
export function printClaims(label: string, token: string): void {
  const c = decodeJwt(token) as Record<string, unknown>;
  const exp = typeof c.exp === "number" ? c.exp : undefined;
  const iat = typeof c.iat === "number" ? c.iat : undefined;
  const ttl = exp !== undefined && iat !== undefined ? `${exp - iat}s` : "?";
  console.log(`\n── ${label} ──`);
  console.log(
    JSON.stringify(
      { sub: c.sub, aud: c.aud, azp: c.azp, scope: c.scope, ttl },
      null,
      2,
    ),
  );
}
