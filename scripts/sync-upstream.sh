#!/usr/bin/env bash
# Rebase our fork branch onto the current upstream main and prove it still builds.
# Fork-only helper: see FORK.md. Upstream never sees this file.
set -euo pipefail

BRANCH="fork/main"
UPSTREAM_REMOTE="upstream"
PUSH=0
[[ ${1:-} == --push ]] && PUSH=1

cd "$(git rev-parse --show-toplevel)"

if [[ -n $(git status --porcelain) ]]; then
	echo "sync-upstream: working tree is dirty; commit or stash first" >&2
	exit 1
fi

current=$(git rev-parse --abbrev-ref HEAD)
if [[ $current != "$BRANCH" ]]; then
	echo "sync-upstream: switching to $BRANCH (was on $current)"
	git checkout "$BRANCH"
fi

git fetch --prune "$UPSTREAM_REMOTE"
base="$(git merge-base HEAD "$UPSTREAM_REMOTE/main")"
if [[ $base == $(git rev-parse "$UPSTREAM_REMOTE/main") ]]; then
	echo "sync-upstream: $BRANCH is already on top of $UPSTREAM_REMOTE/main"
else
	echo "sync-upstream: rebasing onto $UPSTREAM_REMOTE/main ($(git log --oneline -1 "$UPSTREAM_REMOTE/main"))"
	git rebase "$UPSTREAM_REMOTE/main"
fi

echo "sync-upstream: building and testing"
cargo build -p tirith
cargo test -p tirith-core --lib shell_receipt
if [[ -d tui/node_modules ]]; then
	(cd tui && pnpm -s test && pnpm -s build)
else
	echo "sync-upstream: skipping tui checks (run 'cd tui && pnpm install' once)"
fi

if ((PUSH)); then
	git push --force-with-lease origin "$BRANCH"
	echo "sync-upstream: pushed $BRANCH"
fi

echo "sync-upstream: done ($(git log --oneline -1))"
