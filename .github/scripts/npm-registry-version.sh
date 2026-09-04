#!/usr/bin/env bash
# SPDX-FileCopyrightText: Max Health Inc.
# SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

# Prints a version from the registry, or nothing if absent. Fails only when the
# registry could not be read, so a caller cannot mistake that for "unpublished".
#
# Usage: npm-registry-version.sh <name>[@<version>]

set -euo pipefail

SPEC="${1:?usage: npm-registry-version.sh <name>[@<version>]}"
REGISTRY="${NPM_REGISTRY:-https://npm.pkg.github.com}"

ERR="$(mktemp)"
trap 'rm -f "$ERR"' EXIT

FOUND="$(npm view "$SPEC" version --registry="$REGISTRY" 2>"$ERR" || true)"

if [ -z "$FOUND" ] && grep -qE 'E401|E403|ENEEDAUTH|EAUTHUNKNOWN' "$ERR"; then
  echo "::error::Cannot read $SPEC from $REGISTRY - the token is not authenticating. Refusing to treat that as unpublished." >&2
  sed 's/^/  /' "$ERR" >&2
  exit 1
fi

printf '%s\n' "$FOUND" | tail -1
