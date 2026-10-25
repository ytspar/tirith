#!/usr/bin/env bash
# Build this fork and install it next to the Ink menus.
#
#   scripts/install-local.sh            # ~/.local/bin
#   PREFIX=/usr/local scripts/install-local.sh
#
# It installs the release binary and points `tirith-menu` at the TUI build, so
# `tirith menu block|stuck` finds it as a sibling of the executable (the first
# place it looks) and the prebuilt shell hooks resolve both through one install.
set -euo pipefail

repo=$(cd -- "$(dirname -- "$0")/.." && pwd)
prefix="${PREFIX:-$HOME/.local}"
bin="$prefix/bin"

cargo build --release -p tirith --manifest-path "$repo/Cargo.toml"
install -d "$bin"
install -m 0755 "$repo/target/release/tirith" "$bin/tirith"

tui="$repo/tui/dist/index.js"
if [[ -f "$tui" ]]; then
  # A symlink, not a copy: the build keeps its dependencies external and
  # resolves them from tui/node_modules relative to the real file.
  ln -sfn "$tui" "$bin/tirith-menu"
else
  printf 'warning: %s is missing; run "pnpm install && pnpm build" in tui/\n' "$tui" >&2
fi

printf 'installed %s\n' "$bin/tirith"
"$bin/tirith" --version
