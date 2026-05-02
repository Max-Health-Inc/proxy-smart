#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# seed-dicom.sh — Upload DICOM files to Orthanc PACS via STOW-RS
#
# Usage:
#   ./seed-dicom.sh [ORTHANC_URL] [DICOM_DIR]
#
# Defaults:
#   ORTHANC_URL = http://localhost:8042
#   DICOM_DIR   = ./dicom (relative to this script)
#
# The script is idempotent — re-uploading the same DICOM instance is a no-op
# in Orthanc (it detects duplicates by SOP Instance UID).
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

ORTHANC_URL="${1:-http://localhost:8042}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DICOM_DIR="${2:-${SCRIPT_DIR}/dicom}"
BOUNDARY="----SeedDICOMBoundary"

if [ ! -d "$DICOM_DIR" ]; then
  echo "⚠️  DICOM directory not found: $DICOM_DIR"
  exit 0
fi

# Collect all .dcm files (recursive — supports subdirectories like lidc-idri-0001/)
DCM_FILES=()
while IFS= read -r -d '' f; do
  DCM_FILES+=("$f")
done < <(find "$DICOM_DIR" -name '*.dcm' -print0 2>/dev/null)

if [ "${#DCM_FILES[@]}" -eq 0 ]; then
  echo "ℹ️  No .dcm files found in $DICOM_DIR — skipping DICOM seed"
  exit 0
fi

echo "🏥 Seeding ${#DCM_FILES[@]} DICOM file(s) to Orthanc at $ORTHANC_URL..."

# Wait for Orthanc to be ready (up to 60s)
for i in $(seq 1 12); do
  if curl -sf "${ORTHANC_URL}/system" >/dev/null 2>&1; then
    echo "  ✅ Orthanc is ready"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo "  ⚠️  Orthanc not reachable after 60s — skipping DICOM seed"
    exit 0
  fi
  sleep 5
done

# Upload each .dcm via STOW-RS (one per request for simplicity)
UPLOADED=0
SKIPPED=0
FAILED=0

for dcm in "${DCM_FILES[@]}"; do
  FILENAME="$(basename "$dcm")"

  # Build multipart/related body in a temp file
  TMPFILE="$(mktemp)"
  {
    printf '\r\n--%s\r\nContent-Type: application/dicom\r\n\r\n' "$BOUNDARY"
    cat "$dcm"
    printf '\r\n--%s--\r\n' "$BOUNDARY"
  } > "$TMPFILE"

  HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' \
    -X POST "${ORTHANC_URL}/dicom-web/studies" \
    -H "Content-Type: multipart/related; type=\"application/dicom\"; boundary=${BOUNDARY}" \
    -H "Accept: application/dicom+json" \
    --data-binary "@${TMPFILE}" 2>/dev/null || echo "000")

  rm -f "$TMPFILE"

  case "$HTTP_CODE" in
    200|202)
      echo "  ✅ ${FILENAME} — uploaded"
      UPLOADED=$((UPLOADED + 1))
      ;;
    409)
      echo "  ℹ️  ${FILENAME} — already exists (duplicate)"
      SKIPPED=$((SKIPPED + 1))
      ;;
    *)
      echo "  ⚠️  ${FILENAME} — HTTP ${HTTP_CODE}"
      FAILED=$((FAILED + 1))
      ;;
  esac
done

echo "📊 DICOM seed complete: ${UPLOADED} uploaded, ${SKIPPED} skipped, ${FAILED} failed"
