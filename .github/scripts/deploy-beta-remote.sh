#!/usr/bin/env bash
# deploy-beta-remote.sh — Runs on VPS to deploy the beta stack
#
# Required env vars: DEPLOY_DIR, GH_TOKEN, GH_ACTOR
# Optional env vars: RESEND_API_KEY
set -euo pipefail

: "${DEPLOY_DIR:?DEPLOY_DIR is required}"
: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GH_ACTOR:?GH_ACTOR is required}"

cd "$DEPLOY_DIR"
COMPOSE="docker compose -f docker-compose.beta.yml --env-file .env.beta"

# ── 1. GHCR Login ──
echo "$GH_TOKEN" | docker login ghcr.io -u "$GH_ACTOR" --password-stdin

# ── 2. Caddy Proxy (keep running if healthy — avoids downtime) ──
docker network create caddy 2>/dev/null || true
if docker inspect caddy-proxy >/dev/null 2>&1 && \
   docker inspect -f '{{.State.Running}}' caddy-proxy 2>/dev/null | grep -q true; then
  echo '✅ Caddy proxy already running — keeping it'
else
  echo '🔄 Caddy proxy not running — starting it'
  docker rm -f caddy-proxy 2>/dev/null || true
  docker compose -p caddy-proxy -f docker-compose.caddy.yml up -d
fi

# ── 3. Pull Images ──
echo '📦 Pulling pre-built images...'
$COMPOSE pull

# ── 4. Start Infrastructure ──
echo '🏗️ Starting infrastructure services (postgres, keycloak, hapi-fhir, orthanc)...'
docker network rm proxy-smart-beta-network 2>/dev/null || true
$COMPOSE up -d postgres

for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U postgres -d keycloak >/dev/null 2>&1; then
    echo '  ✅ Postgres ready'
    break
  fi
  sleep 2
done

# Ensure application databases exist on the RUNNING Postgres.
# init.sql is only auto-run by Postgres on a fresh data volume; the beta
# postgres_data volume is persistent, so on existing deployments the
# proxy_smart DB (used by the backend's DATABASE_URL) would never be created.
# init.sql is idempotent (CREATE DATABASE ... WHERE NOT EXISTS ... \gexec), so
# re-running it every deploy is safe. Run it before dependent services start.
echo '🗄️ Ensuring application databases exist (idempotent init.sql)...'
if $COMPOSE exec -T postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/init.sql; then
  echo '  ✅ Application databases ensured'
else
  echo '  ⚠️ init.sql apply returned non-zero — continuing (databases may already exist)'
fi

$COMPOSE up -d keycloak hapi-fhir orthanc

# ── 5. Wait for Keycloak ──
echo '  ⏳ Waiting for Keycloak...'
for i in $(seq 1 80); do
  KC_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' proxy-smart-keycloak-beta 2>/dev/null || echo 'none')
  if [ "$KC_HEALTH" = 'healthy' ]; then
    echo '  ✅ Keycloak ready'
    break
  fi
  if [ "$i" -eq 80 ]; then
    echo "  ❌ Keycloak not ready after 240s (status: $KC_HEALTH)"
    docker logs --tail 40 proxy-smart-keycloak-beta 2>&1 || true
    exit 1
  fi
  sleep 3
done

# ── 6. Canary Test ──
echo '🔬 Canary-testing new backend image before swap...'
BACKEND_IMG=$(grep BACKEND_IMAGE .env.beta | cut -d= -f2)
ORTHANC_PW=$(grep '^ORTHANC_PASSWORD=' .env.beta | cut -d= -f2)
CANARY=proxy-smart-backend-canary

docker rm -f $CANARY 2>/dev/null || true

docker run -d --name $CANARY \
  --network proxy-smart-beta-network \
  --memory 1024m \
  --env-file .env.beta \
  -p 9445:9445 \
  -v "$DEPLOY_DIR/proxy-signing-key.pem:/run/secrets/proxy-signing-key.pem:ro" \
  -e NODE_ENV=production \
  -e PORT=9445 \
  -e BASE_URL=https://beta.proxy-smart.com \
  -e KEYCLOAK_BASE_URL=http://keycloak:8080/auth \
  -e KEYCLOAK_PUBLIC_URL=https://beta.proxy-smart.com/auth \
  -e KEYCLOAK_DOMAIN=beta.proxy-smart.com \
  -e KEYCLOAK_REALM=proxy-smart \
  -e KEYCLOAK_JWKS_URI=http://keycloak:8080/auth/realms/proxy-smart/protocol/openid-connect/certs \
  -e KEYCLOAK_ADMIN_CLIENT_ID=admin-service \
  -e FHIR_SERVER_BASE=http://hapi-fhir:8080/fhir \
  -e CORS_ORIGINS=https://beta.proxy-smart.com,http://localhost:4567 \
  -e DICOMWEB_BASE_URL=http://orthanc:8042/dicom-web \
  -e DICOMWEB_USERNAME=${ORTHANC_USERNAME:-orthanc} \
  -e DICOMWEB_PASSWORD="$ORTHANC_PW" \
  -e PROXY_SIGNING_KEY_FILE=/run/secrets/proxy-signing-key.pem \
  "$BACKEND_IMG"

CANARY_OK=false
for i in $(seq 1 60); do
  if ! docker inspect -f '{{.State.Running}}' $CANARY 2>/dev/null | grep -q true; then
    echo '  ❌ Canary container crashed!'
    OOM=$(docker inspect -f '{{.State.OOMKilled}}' $CANARY 2>/dev/null || echo '?')
    CODE=$(docker inspect -f '{{.State.ExitCode}}' $CANARY 2>/dev/null || echo '?')
    echo "  📊 Exit code: $CODE | OOMKilled: $OOM"
    docker logs --tail 50 $CANARY 2>&1 || true
    break
  fi
  if curl -sf --connect-timeout 5 --max-time 10 -o /dev/null \
       -w '%{http_code}' http://localhost:9445/health 2>/dev/null | grep -qE '^(200|503)$'; then
    CANARY_OK=true
    echo '  ✅ Canary health check passed — safe to swap'
    break
  fi
  echo "  ⏳ Canary not ready yet (attempt $i/60)..."
  sleep 5
done

if [ "$CANARY_OK" != 'true' ]; then
  echo '📋 Canary container logs:'
  docker logs --tail 80 $CANARY 2>&1 || true
fi
docker rm -f $CANARY 2>/dev/null || true

if [ "$CANARY_OK" != 'true' ]; then
  echo '❌ CANARY FAILED — aborting deploy to keep current version running'
  exit 1
fi

# ── 7. Swap to New Version ──
echo '🔄 Swapping to new version...'
$COMPOSE up -d --remove-orphans

# ── 8. Wait for Services ──
echo '⏳ Waiting for services to become healthy...'
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U postgres -d keycloak >/dev/null 2>&1; then
    echo '  ✅ Postgres ready'
    break
  fi
  sleep 2
done

echo '  ⏳ Waiting for backend...'
BACKEND_READY=false
for i in $(seq 1 120); do
  BE_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' proxy-smart-backend-beta 2>/dev/null || echo 'none')
  if [ "$BE_HEALTH" = 'healthy' ]; then
    echo '  ✅ Backend ready'
    BACKEND_READY=true
    break
  fi
  if [ $((i % 12)) -eq 0 ]; then
    echo "  ⏳ Backend not ready yet (status: $BE_HEALTH, $((i * 5))s elapsed)..."
  fi
  sleep 5
done
if [ "$BACKEND_READY" != 'true' ]; then
  echo "  ⚠️ Backend not healthy after 600s (status: $BE_HEALTH) — continuing anyway"
  docker logs --tail 40 proxy-smart-backend-beta 2>&1 || true
fi

# ── 9. SMTP Configuration (optional) ──
if [ -n "${RESEND_API_KEY:-}" ]; then
  echo '📧 Configuring Keycloak SMTP...'
  KC_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{break}}{{end}}' \
    proxy-smart-keycloak-beta 2>/dev/null)

  if [ -z "$KC_IP" ]; then
    echo '  ⚠️ Keycloak container not found — skipping SMTP'
  else
    KC_BASE="http://${KC_IP}:8080/auth"
    KC_READY=false
    for i in $(seq 1 20); do
      if curl -sf --connect-timeout 5 --max-time 10 \
           "http://${KC_IP}:9000/auth/health/ready" >/dev/null 2>&1; then
        KC_READY=true
        break
      fi
      sleep 3
    done

    if [ "$KC_READY" != 'true' ]; then
      echo '  ⚠️ Keycloak not ready — skipping SMTP (will retry next deploy)'
    else
      KC_PASS=$(grep '^KEYCLOAK_ADMIN_PASSWORD=' .env.beta | cut -d= -f2)
      KC_TOKEN=$(curl -sf -X POST "${KC_BASE}/realms/master/protocol/openid-connect/token" \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        -d 'username=admin' \
        -d "password=${KC_PASS}" \
        -d 'grant_type=password' \
        -d 'client_id=admin-cli' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

      if [ -z "$KC_TOKEN" ]; then
        echo '  ⚠️ Could not get Keycloak admin token — skipping SMTP'
      else
        EXISTING_HOST=$(curl -sf "${KC_BASE}/admin/realms/proxy-smart" \
          -H "Authorization: Bearer $KC_TOKEN" \
          | grep -o '"host":"[^"]*"' | head -1 | cut -d'"' -f4 || true)

        if [ "$EXISTING_HOST" = 'smtp.resend.com' ]; then
          echo '  ✅ SMTP already configured'
        else
          curl -sf -X PUT "${KC_BASE}/admin/realms/proxy-smart" \
            -H 'Content-Type: application/json' \
            -H "Authorization: Bearer $KC_TOKEN" \
            -d '{
              "resetPasswordAllowed": true,
              "smtpServer": {
                "host": "smtp.resend.com",
                "port": "465",
                "from": "noreply@maxhealth.tech",
                "fromDisplayName": "Proxy Smart",
                "replyTo": "noreply@maxhealth.tech",
                "ssl": "true",
                "auth": "true",
                "user": "resend",
                "password": "'"${RESEND_API_KEY}"'"
              }
            }'
          echo '  ✅ SMTP configured (Resend via maxhealth.tech)'
        fi
      fi
    fi
  fi
else
  echo '⚠️ RESEND_API_KEY not set — skipping SMTP'
fi

# ── 10. Keycloak IDP Reconciliation ──
# realm-export.json uses IGNORE_EXISTING, so IDP settings drift after manual changes.
# This step ensures proxy-smart-signing is always hidden on the login page.
echo '🔧 Reconciling Keycloak IDP settings...'
KC_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{break}}{{end}}' \
  proxy-smart-keycloak-beta 2>/dev/null)

if [ -n "$KC_IP" ]; then
  KC_BASE="http://${KC_IP}:8080/auth"
  KC_PASS=$(grep '^KEYCLOAK_ADMIN_PASSWORD=' .env.beta | cut -d= -f2)
  KC_TOKEN=$(curl -sf -X POST "${KC_BASE}/realms/master/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d 'username=admin' \
    -d "password=${KC_PASS}" \
    -d 'grant_type=password' \
    -d 'client_id=admin-cli' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$KC_TOKEN" ]; then
    # Hide proxy-smart-signing IDP (used for backend token signing, not user login)
    SIGNING_IDP=$(curl -sf "${KC_BASE}/admin/realms/proxy-smart/identity-provider/instances/proxy-smart-signing" \
      -H "Authorization: Bearer $KC_TOKEN")

    if [ -n "$SIGNING_IDP" ]; then
      # Keycloak 26.x uses config.hideOnLoginPage (string "true"), not top-level hideOnLogin
      UPDATED_IDP=$(echo "$SIGNING_IDP" | sed 's/"config":{/"config":{"hideOnLoginPage":"true",/')
      HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' -X PUT \
        "${KC_BASE}/admin/realms/proxy-smart/identity-provider/instances/proxy-smart-signing" \
        -H "Authorization: Bearer $KC_TOKEN" \
        -H 'Content-Type: application/json' \
        -d "$UPDATED_IDP")
      if [ "$HTTP_CODE" = '204' ]; then
        echo '  ✅ proxy-smart-signing IDP hidden on login page'
      else
        echo "  ⚠️ Failed to hide proxy-smart-signing (HTTP $HTTP_CODE)"
      fi
    else
      echo '  ℹ️ proxy-smart-signing IDP not found — skipping'
    fi
  else
    echo '  ⚠️ Could not get Keycloak admin token — skipping IDP reconciliation'
  fi
else
  echo '  ⚠️ Keycloak container not found — skipping IDP reconciliation'
fi

# ── 10b. Keycloak Resource-Indicator Reconciliation ──
# realm-export.json uses IGNORE_EXISTING, so RFC 8707 resource-indicator wiring
# (resource clients + shared scope + default-scope attachment) does NOT reach an
# existing beta realm via import. This best-effort, non-fatal block reconciles:
#   1. the resource clients fhir-resource-server / mcp-resource-server
#      (each holding a resource_url attribute the post-processor binds into aud)
#   2. the resource-indicators client scope (two oidc-audience-mappers)
#   3. that scope attached as a DEFAULT scope on each beta SMART app client
# All sub-steps are idempotent and parse JSON with grep/cut (no jq dependency).
echo '🔧 Reconciling Keycloak resource indicators...'
RI_FHIR_URL='https://beta.proxy-smart.com/proxy-smart-backend/hapi-fhir-server/R4'
RI_MCP_URL='https://beta.proxy-smart.com/mcp'
KC_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{break}}{{end}}' \
  proxy-smart-keycloak-beta 2>/dev/null || true)

if [ -n "${KC_IP:-}" ]; then
  KC_BASE="http://${KC_IP}:8080/auth"
  KC_PASS=$(grep '^KEYCLOAK_ADMIN_PASSWORD=' .env.beta | cut -d= -f2 || true)
  KC_TOKEN=$(curl -sf -X POST "${KC_BASE}/realms/master/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d 'username=admin' \
    -d "password=${KC_PASS}" \
    -d 'grant_type=password' \
    -d 'client_id=admin-cli' 2>/dev/null | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4 || true)

  if [ -n "${KC_TOKEN:-}" ]; then
    KC_CLIENTS="${KC_BASE}/admin/realms/proxy-smart/clients"
    KC_SCOPES="${KC_BASE}/admin/realms/proxy-smart/client-scopes"

    # Step 1: ensure the two resource clients exist with the right resource_url.
    ensure_resource_client() {
      RC_ID="$1"; RC_NAME="$2"; RC_DESC="$3"; RC_URL="$4"
      EXISTING=$(curl -sf "${KC_CLIENTS}?clientId=${RC_ID}" \
        -H "Authorization: Bearer $KC_TOKEN" 2>/dev/null || true)
      RC_UUID=$(echo "$EXISTING" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
      RC_BODY=$(cat <<JSON
{"clientId":"${RC_ID}","name":"${RC_NAME}","description":"${RC_DESC}","enabled":true,"clientAuthenticatorType":"client-secret","protocol":"openid-connect","publicClient":false,"bearerOnly":false,"standardFlowEnabled":false,"implicitFlowEnabled":false,"directAccessGrantsEnabled":false,"serviceAccountsEnabled":false,"authorizationServicesEnabled":false,"fullScopeAllowed":false,"attributes":{"resource_url":"${RC_URL}"}}
JSON
)
      if [ -z "$RC_UUID" ]; then
        HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' -X POST "$KC_CLIENTS" \
          -H "Authorization: Bearer $KC_TOKEN" -H 'Content-Type: application/json' \
          -d "$RC_BODY" 2>/dev/null || true)
        if [ "${HTTP_CODE:-}" = '201' ]; then
          echo "  ✅ Created resource client ${RC_ID}"
        else
          echo "  ⚠️ Failed to create resource client ${RC_ID} (HTTP ${HTTP_CODE:-none})"
        fi
      else
        HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' -X PUT "${KC_CLIENTS}/${RC_UUID}" \
          -H "Authorization: Bearer $KC_TOKEN" -H 'Content-Type: application/json' \
          -d "$RC_BODY" 2>/dev/null || true)
        if [ "${HTTP_CODE:-}" = '204' ]; then
          echo "  ✅ Reconciled resource_url for ${RC_ID}"
        else
          echo "  ⚠️ Failed to reconcile resource client ${RC_ID} (HTTP ${HTTP_CODE:-none})"
        fi
      fi
    }
    ensure_resource_client 'fhir-resource-server' \
      'FHIR Resource Server (RFC 8707 resource indicator)' \
      'Non-login resource client. Holds resource_url = the proxy FHIR base.' \
      "$RI_FHIR_URL"
    ensure_resource_client 'mcp-resource-server' \
      'MCP Resource Server (RFC 8707 resource indicator)' \
      'Non-login resource client. Holds resource_url = the proxy MCP URL.' \
      "$RI_MCP_URL"

    # Step 2: ensure the resource-indicators client scope exists with both
    # oidc-audience-mappers (fhir-resource-server + mcp-resource-server).
    ALL_SCOPES=$(curl -sf "$KC_SCOPES" -H "Authorization: Bearer $KC_TOKEN" 2>/dev/null || true)
    if echo "$ALL_SCOPES" | grep -q '"name":"resource-indicators"'; then
      echo '  ✅ resource-indicators client scope already present'
    else
      SCOPE_BODY='{"name":"resource-indicators","description":"RFC 8707 resource indicators: pre-populates the access-token aud with the resource-client ids.","protocol":"openid-connect","attributes":{"include.in.token.scope":"false","display.on.consent.screen":"false"}}'
      HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' -X POST "$KC_SCOPES" \
        -H "Authorization: Bearer $KC_TOKEN" -H 'Content-Type: application/json' \
        -d "$SCOPE_BODY" 2>/dev/null || true)
      if [ "${HTTP_CODE:-}" = '201' ]; then
        echo '  ✅ Created resource-indicators client scope'
      else
        echo "  ⚠️ Failed to create resource-indicators scope (HTTP ${HTTP_CODE:-none})"
      fi
    fi

    # Resolve the scope id, then ensure both audience mappers exist on it.
    SCOPE_LIST=$(curl -sf "$KC_SCOPES" -H "Authorization: Bearer $KC_TOKEN" 2>/dev/null || true)
    # Isolate the resource-indicators object, then take the id that precedes its name.
    RI_SCOPE_ID=$(echo "$SCOPE_LIST" \
      | grep -o '{"id":"[^"]*","name":"resource-indicators"' \
      | head -1 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
    if [ -n "${RI_SCOPE_ID:-}" ]; then
      EXISTING_MAPPERS=$(curl -sf "${KC_SCOPES}/${RI_SCOPE_ID}/protocol-mappers/models" \
        -H "Authorization: Bearer $KC_TOKEN" 2>/dev/null || true)
      ensure_audience_mapper() {
        MAP_NAME="$1"; MAP_AUD="$2"
        if echo "$EXISTING_MAPPERS" | grep -q "\"name\":\"${MAP_NAME}\""; then
          echo "  ✅ Audience mapper ${MAP_NAME} already present"
          return
        fi
        MAP_BODY=$(cat <<JSON
{"name":"${MAP_NAME}","protocol":"openid-connect","protocolMapper":"oidc-audience-mapper","consentRequired":false,"config":{"included.client.audience":"${MAP_AUD}","id.token.claim":"false","access.token.claim":"true"}}
JSON
)
        HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' -X POST \
          "${KC_SCOPES}/${RI_SCOPE_ID}/protocol-mappers/models" \
          -H "Authorization: Bearer $KC_TOKEN" -H 'Content-Type: application/json' \
          -d "$MAP_BODY" 2>/dev/null || true)
        if [ "${HTTP_CODE:-}" = '201' ]; then
          echo "  ✅ Added audience mapper ${MAP_NAME}"
        else
          echo "  ⚠️ Failed to add audience mapper ${MAP_NAME} (HTTP ${HTTP_CODE:-none})"
        fi
      }
      ensure_audience_mapper 'fhir-resource-audience' 'fhir-resource-server'
      ensure_audience_mapper 'mcp-resource-audience' 'mcp-resource-server'

      # Step 3: attach the scope as a DEFAULT client scope on each SMART app.
      for SMART_CLIENT in admin-ui mcp-client patient-portal dicom-viewer consent-app dtr-app; do
        SC_UUID=$(curl -sf "${KC_CLIENTS}?clientId=${SMART_CLIENT}" \
          -H "Authorization: Bearer $KC_TOKEN" 2>/dev/null \
          | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
        if [ -z "${SC_UUID:-}" ]; then
          echo "  ℹ️ SMART client ${SMART_CLIENT} not found — skipping scope attach"
          continue
        fi
        HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' -X PUT \
          "${KC_CLIENTS}/${SC_UUID}/default-client-scopes/${RI_SCOPE_ID}" \
          -H "Authorization: Bearer $KC_TOKEN" 2>/dev/null || true)
        if [ "${HTTP_CODE:-}" = '204' ]; then
          echo "  ✅ Attached resource-indicators default scope to ${SMART_CLIENT}"
        else
          echo "  ⚠️ Could not attach resource-indicators to ${SMART_CLIENT} (HTTP ${HTTP_CODE:-none})"
        fi
      done
    else
      # TODO: operator action — could not resolve the resource-indicators scope id
      # via grep. Run manually once:
      #   GET  /admin/realms/proxy-smart/client-scopes  (find the "resource-indicators" id)
      #   POST /admin/realms/proxy-smart/client-scopes/{id}/protocol-mappers/models  (both audience mappers)
      #   PUT  /admin/realms/proxy-smart/clients/{clientUuid}/default-client-scopes/{id}  (per SMART client)
      echo '  ⚠️ Could not resolve resource-indicators scope id — see TODO in deploy script'
    fi
  else
    echo '  ⚠️ Could not get Keycloak admin token — skipping resource-indicator reconciliation'
  fi
else
  echo '  ⚠️ Keycloak container not found — skipping resource-indicator reconciliation'
fi

# ── 10c. Keycloak Device-Grant Reconciliation (admin-ui) ──
# realm-export.json uses IGNORE_EXISTING, so flipping
# oauth2.device.authorization.grant.enabled to "true" on admin-ui in the export
# never reaches an already-imported beta realm. The CLI's interactive login
# (RFC 8628 device flow) uses the admin-ui client, so without this attribute
# Keycloak rejects the device-authorization request with unauthorized_client.
# Best-effort, non-fatal, idempotent: GET admin-ui by clientId, set the
# attribute via grep/sed (no jq on the VPS), PUT the updated representation.
echo '🔧 Reconciling admin-ui device-authorization grant...'
KC_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{break}}{{end}}' \
  proxy-smart-keycloak-beta 2>/dev/null || true)

if [ -n "${KC_IP:-}" ]; then
  KC_BASE="http://${KC_IP}:8080/auth"
  KC_PASS=$(grep '^KEYCLOAK_ADMIN_PASSWORD=' .env.beta | cut -d= -f2 || true)
  KC_TOKEN=$(curl -sf -X POST "${KC_BASE}/realms/master/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d 'username=admin' \
    -d "password=${KC_PASS}" \
    -d 'grant_type=password' \
    -d 'client_id=admin-cli' 2>/dev/null | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4 || true)

  if [ -n "${KC_TOKEN:-}" ]; then
    KC_CLIENTS="${KC_BASE}/admin/realms/proxy-smart/clients"
    ADMIN_UI=$(curl -sf "${KC_CLIENTS}?clientId=admin-ui" \
      -H "Authorization: Bearer $KC_TOKEN" 2>/dev/null || true)
    # The list endpoint returns a JSON array; strip the surrounding [ ] to get the object.
    ADMIN_UI=$(echo "$ADMIN_UI" | sed 's/^\[//; s/\]$//')
    AU_UUID=$(echo "$ADMIN_UI" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)

    if [ -z "${AU_UUID:-}" ]; then
      echo '  ℹ️ admin-ui client not found — skipping device-grant reconciliation'
    elif echo "$ADMIN_UI" | grep -q '"oauth2.device.authorization.grant.enabled":"true"'; then
      echo '  ✅ admin-ui device-authorization grant already enabled'
    else
      # Flip an existing "false" value, or inject the attribute if absent.
      if echo "$ADMIN_UI" | grep -q '"oauth2.device.authorization.grant.enabled":"false"'; then
        UPDATED_AU=$(echo "$ADMIN_UI" \
          | sed 's/"oauth2.device.authorization.grant.enabled":"false"/"oauth2.device.authorization.grant.enabled":"true"/')
      else
        UPDATED_AU=$(echo "$ADMIN_UI" \
          | sed 's/"attributes":{/"attributes":{"oauth2.device.authorization.grant.enabled":"true",/')
      fi
      HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' -X PUT "${KC_CLIENTS}/${AU_UUID}" \
        -H "Authorization: Bearer $KC_TOKEN" -H 'Content-Type: application/json' \
        -d "$UPDATED_AU" 2>/dev/null || true)
      if [ "${HTTP_CODE:-}" = '204' ]; then
        echo '  ✅ admin-ui device-authorization grant enabled'
      else
        echo "  ⚠️ Failed to enable admin-ui device grant (HTTP ${HTTP_CODE:-none})"
      fi
    fi
  else
    echo '  ⚠️ Could not get Keycloak admin token — skipping device-grant reconciliation'
  fi
else
  echo '  ⚠️ Keycloak container not found — skipping device-grant reconciliation'
fi

# ── 11. Seed Data ──
echo '🏥 Seeding HAPI FHIR with sample data...'
HAPI_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{if .IPAddress}}{{.IPAddress}}{{end}}{{end}}' \
  proxy-smart-hapi-fhir-beta 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)

if [ -z "$HAPI_IP" ]; then
  echo '  ⚠️ Could not resolve HAPI FHIR container IP — skipping seed'
else
  HAPI_BASE="http://${HAPI_IP}:8080/fhir"

  for i in $(seq 1 30); do
    if curl -sf --connect-timeout 5 --max-time 10 "${HAPI_BASE}/metadata" >/dev/null 2>&1; then
      echo '  ✅ HAPI FHIR ready'
      break
    fi
    sleep 5
  done

  SEED_RESP=$(curl -s --connect-timeout 10 --max-time 60 -w '\n%{http_code}' \
    -X POST "${HAPI_BASE}" \
    -H 'Content-Type: application/fhir+json' \
    -d @fhir-seed-bundle.json)
  HTTP_CODE=$(echo "$SEED_RESP" | tail -1)
  SEED_BODY=$(echo "$SEED_RESP" | sed '$d')

  if [ "$HTTP_CODE" = '200' ]; then
    echo '  ✅ FHIR data seeded'
  else
    echo "  ⚠️ FHIR seed returned HTTP ${HTTP_CODE} (non-fatal)"
    echo "  Response: ${SEED_BODY}" | head -c 500
  fi

  # Seed Orthanc PACS with DICOM images
  echo '🏥 Seeding Orthanc with DICOM images...'
  ORTHANC_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{if .IPAddress}}{{.IPAddress}}{{end}}{{end}}' \
    proxy-smart-orthanc-beta 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  if [ -n "$ORTHANC_IP" ]; then
    bash ./seed-dicom.sh "http://${ORTHANC_IP}:8042" ./dicom
  else
    echo '  ⚠️ Could not resolve Orthanc IP — skipping DICOM seed'
  fi
fi

echo '✅ Remote deployment complete'
