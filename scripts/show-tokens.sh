#!/usr/bin/env bash
# Show the "before" (accountant) and "after" (exchanged) tokens side by side,
# using only curl + jq — no browser, no jwt.io. Requires the Keycloak container
# from docker-compose to be running.
set -euo pipefail

KC="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${REALM:-agents-demo}"
TOKEN_ENDPOINT="$KC/realms/$REALM/protocol/openid-connect/token"

# Decode the JWT payload (base64url) using jq's @base64d, which tolerates the
# missing padding, and print the claims that matter for this demo.
decode() { jq -R 'split(".")[1] | gsub("-";"+") | gsub("_";"/") | @base64d | fromjson | {sub, aud, azp, scope, exp}'; }

echo "== BEFORE: accountant token (expense-portal, broad scope) =="
OP=$(curl -s -X POST "$TOKEN_ENDPOINT" \
  -d grant_type=password -d client_id=expense-portal \
  -d username=accountant-123 -d password=password | jq -r .access_token)
echo "$OP" | decode

echo
echo "== AFTER: exchanged token (expense-agent -> expense-api, expenses:read) =="
curl -s -X POST "$TOKEN_ENDPOINT" \
  -u expense-agent:expense-agent-secret \
  -d grant_type=urn:ietf:params:oauth:grant-type:token-exchange \
  -d subject_token="$OP" \
  -d subject_token_type=urn:ietf:params:oauth:token-type:access_token \
  -d requested_token_type=urn:ietf:params:oauth:token-type:access_token \
  -d audience=expense-api \
  -d scope=expenses:read | jq -r .access_token | decode
