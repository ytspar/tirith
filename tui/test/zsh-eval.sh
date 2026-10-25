#!/bin/zsh
# Round-trip guardrail: --emit zsh output must eval back to the same values in zsh.
# Run from the repo root (pnpm test runs it from there).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=$(pnpm -s exec tsx -e "
  import { emitDecision } from './src/decision';
  const command = \"printf '%s' 'a b' | tee ~/it's\\\\ a\\\\ file; echo \$((1+1))\";
  process.stdout.write(emitDecision({ action: 'edit', command }, 'zsh'));
")
eval "$OUT"
[[ "$action" == "edit" ]] || { echo "action mismatch: $action"; exit 1; }
EXPECTED="printf '%s' 'a b' | tee ~/it's\\ a\\ file; echo \$((1+1))"
[[ "$command" == "$EXPECTED" ]] || { echo "command mismatch:"; echo "got: $command"; exit 1; }
echo "zsh eval round-trip OK"
