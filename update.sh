#!/usr/bin/env bash
# AiDevOps Dashboard — Update Script
# Pulls latest from GitHub, installs deps, rebuilds client.
# Usage: ./update.sh [--check]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --check mode: just report if update is available, exit 0 if yes, 1 if no
if [[ "${1:-}" == "--check" ]]; then
	git fetch origin main --quiet 2>/dev/null
	LOCAL=$(git rev-parse HEAD)
	REMOTE=$(git rev-parse origin/main)
	if [[ "$LOCAL" != "$REMOTE" ]]; then
		LOCAL_VER=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
		REMOTE_VER=$(git show origin/main:package.json | grep '"version"' | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
		BEHIND=$(git rev-list HEAD..origin/main --count)
		echo "{\"updateAvailable\":true,\"currentVersion\":\"${LOCAL_VER}\",\"latestVersion\":\"${REMOTE_VER}\",\"commitsBehind\":${BEHIND},\"currentSha\":\"${LOCAL:0:7}\",\"latestSha\":\"${REMOTE:0:7}\"}"
		exit 0
	else
		LOCAL_VER=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
		echo "{\"updateAvailable\":false,\"currentVersion\":\"${LOCAL_VER}\",\"latestVersion\":\"${LOCAL_VER}\",\"commitsBehind\":0,\"currentSha\":\"${LOCAL:0:7}\",\"latestSha\":\"${LOCAL:0:7}\"}"
		exit 1
	fi
fi

echo "=== AiDevOps Dashboard Update ==="

# Ensure we're on main
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
	echo "ERROR: Not on main branch (on: $BRANCH). Aborting."
	exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
	echo "ERROR: Uncommitted changes detected. Stash or commit first."
	exit 1
fi

# Fetch and check
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [[ "$LOCAL" == "$REMOTE" ]]; then
	echo "Already up to date."
	exit 0
fi

BEHIND=$(git rev-list HEAD..origin/main --count)
echo "Pulling $BEHIND new commit(s)..."

# Pull
git pull origin main --ff-only

# Install deps
echo "Installing dependencies..."
bun install --frozen-lockfile 2>/dev/null || bun install
cd client
bun install --frozen-lockfile 2>/dev/null || bun install

# Build client
echo "Building client..."
./node_modules/.bin/vite build

cd "$SCRIPT_DIR"
NEW_VER=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
echo ""
echo "=== Updated to v${NEW_VER} ==="
echo "Restart the server to apply: bun run dev"
