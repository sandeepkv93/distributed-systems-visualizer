#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${BUILD_WORKSPACE_DIRECTORY:-$(pwd)}"
STAMP_FILE="${REPO_ROOT}/node_modules/.codex-bazel-lock-stamp"

if [[ ! -f "${REPO_ROOT}/package-lock.json" ]]; then
  echo "package-lock.json is required for Bazel npm bootstrap." >&2
  exit 1
fi

lock_hash="$(sha256sum "${REPO_ROOT}/package-lock.json" | awk '{print $1}')"
cd "${REPO_ROOT}"
if [[ ! -d "${REPO_ROOT}/node_modules" ]] || [[ ! -f "${STAMP_FILE}" ]]; then
  echo "Installing npm dependencies (npm ci)..."
  npm ci
  mkdir -p "$(dirname "${STAMP_FILE}")"
  printf "%s" "${lock_hash}" > "${STAMP_FILE}"
else
  existing_hash="$(cat "${STAMP_FILE}")"
  if [[ "${lock_hash}" != "${existing_hash}" ]]; then
    echo "package-lock.json changed, reinstalling dependencies (npm ci)..."
    npm ci
    printf "%s" "${lock_hash}" > "${STAMP_FILE}"
  fi
fi

export NEXT_TELEMETRY_DISABLED=1
npx next dev
