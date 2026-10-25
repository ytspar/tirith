#!/usr/bin/env zsh
# Fork-only test for the zsh hook's interactive menus (`tirith menu`).
#
# The menus themselves are UI; everything that matters to the shell is what the
# hook does with the decision (accept the line, rewrite $BUFFER, log a bypass,
# forget a stuck receipt). That contract is asserted here against a fake
# `tirith` that answers the menu protocol, so no terminal or Ink build is needed:
#
#   zsh shell/test/zsh-hook-menu.zsh
# The hook reads several unset-by-default parameters (it runs in user shells
# that do not enable `nounset`), so this test must not.
set +u
repo=${0:A:h:h}
tmp=$(mktemp -d)
ZLE_LOG="$tmp/zle.log"
BYPASS_LOG="$tmp/bypass.log"
: >"$ZLE_LOG"

mkdir -p "$tmp/bin"
fake() {
  cat >"$tmp/bin/tirith"
  chmod +x "$tmp/bin/tirith"
}

export PATH="$tmp/bin:$PATH"
export TIRITH_BYPASS_LOG="$BYPASS_LOG"
export TIRITH_SESSION_ID=test-session
# The fake reads its answers from files: a per-command assignment prefix does not
# reach a function's children in zsh, so `VAR=... _tirith_block_menu` would not.
export TIRITH_FAKE_DIR="$tmp"
decide() { print -r -- "$1" >"$tmp/block" }
decide_stuck() { print -r -- "$1" >"$tmp/stuck" }
decide 'action=proceed'
# The fake has to exist before the hook pins `_TIRITH_BIN`, otherwise the hook
# resolves the real binary on PATH.
fake <<'EOF'
#!/bin/sh
case "$1 $2" in
  "menu --help") printf '%s\n' "Usage: tirith menu <block|stuck>"; exit 0 ;;
  "menu block") cat "$TIRITH_FAKE_DIR/block"; exit 0 ;;
  "menu stuck") cat "$TIRITH_FAKE_DIR/stuck"; exit 0 ;;
  "check --suggest") printf '%s\n' "Fix: use --force with care"; exit 0 ;;
  *) exit 0 ;;
esac
EOF

source "$repo/lib/zsh-hook.zsh"
# `zle` is a builtin that needs a live ZLE; record the calls instead.
zle() { print -r -- "zle $*" >>"$ZLE_LOG"; }

fail=0
check() {
  if [[ "$2" == "$3" ]]; then
    print -r -- "ok   $1"
  else
    print -r -- "FAIL $1: expected [$3] got [$2]"
    fail=1
  fi
}
count() { local n; n=$(grep -c -- "$1" "$2" 2>/dev/null); print -r -- "${n:-0}"; }

# proceed: accept the line unchanged, and log the bypass
BUFFER="rm -rf ~/Downloads"
CURSOR=0
decide 'action=proceed'
_tirith_block_menu "$BUFFER" "report text"
check "proceed keeps the buffer" "$BUFFER" "rm -rf ~/Downloads"
check "proceed accepts the line" "$(count 'zle .accept-line' "$ZLE_LOG")" "1"
check "proceed logs the bypass" "$(count 'rm -rf ~/Downloads' "$BYPASS_LOG")" "1"

# edit: put the rewritten command in the buffer instead
: >"$ZLE_LOG"
decide "action=edit; command='rm -rf ./build'"
_tirith_block_menu "$BUFFER" "report"
check "edit rewrites the buffer" "$BUFFER" "rm -rf ./build"
check "edit does not accept" "$(count 'zle .accept-line' "$ZLE_LOG")" "0"

# cancel: nothing runs, the command stays editable
: >"$ZLE_LOG"
BUFFER="rm -rf ~/Downloads"
decide 'action=cancel'
_tirith_block_menu "$BUFFER" "report"
check "cancel keeps the buffer" "$BUFFER" "rm -rf ~/Downloads"
check "cancel does not accept" "$(count 'zle .accept-line' "$ZLE_LOG")" "0"

# ask-pi with no reviewer configured: no handoff, no execution
: >"$ZLE_LOG"
decide 'action=ask-pi'
_tirith_block_menu "$BUFFER" "report"
check "ask-pi without a reviewer is a no-op" "$(count 'zle .accept-line' "$ZLE_LOG")" "0"

# ask-pi with TIRITH_MENU_ASK_CMD: the snippet runs with the blocked command
ASK_OUT="$tmp/ask.out"
: >"$ASK_OUT"
export TIRITH_MENU_ASK_CMD="print -r -- \"ask:\$1\" >> $ASK_OUT"
decide 'action=ask-pi'
_tirith_block_menu "$BUFFER" "report"
check "ask-pi runs the reviewer snippet" "$(cat "$ASK_OUT")" "ask:rm -rf ~/Downloads"
unset TIRITH_MENU_ASK_CMD

# suggest: print tirith's advice, then reopen the menu (second round cancels)
fake <<'EOF'
#!/bin/sh
case "$1 $2" in
  "menu --help") printf '%s\n' "Usage: tirith menu <block|stuck>"; exit 0 ;;
  "menu block")
    if [ -f "$TIRITH_FAKE_DIR/seen" ]; then cat "$TIRITH_FAKE_DIR/block"; else : >"$TIRITH_FAKE_DIR/seen"; printf '%s\n' "action=suggest"; fi
    exit 0 ;;
  "check --suggest") printf '%s\n' "Fix: use --force with care"; exit 0 ;;
  *) exit 0 ;;
esac
EOF
rm -f "$tmp/seen"
decide 'action=cancel'
: >"$ZLE_LOG"
out=$(_tirith_block_menu "$BUFFER" "report" 2>&1)
check "suggest prints tirith's advice" "$(print -r -- "$out" | grep -c 'Fix: use --force')" "1"
check "suggest loop ends on cancel" "$(count 'zle .accept-line' "$ZLE_LOG")" "0"

# opt-in gate: no menus unless TIRITH_INTERACTIVE_MENU=1
fake <<'EOF'
#!/bin/sh
case "$1 $2" in
  "menu --help") printf '%s\n' "Usage: tirith menu <block|stuck>"; exit 0 ;;
  *) exit 0 ;;
esac
EOF
_TIRITH_MENU_PROBE=-1
unset TIRITH_INTERACTIVE_MENU
if _tirith_menu_available; then check "menus are opt-in" "enabled" "disabled"
else check "menus are opt-in" "disabled" "disabled"; fi
TIRITH_INTERACTIVE_MENU=1 _TIRITH_MENU_PROBE=-1
if TIRITH_INTERACTIVE_MENU=1 _tirith_menu_available; then
  check "opt-in enables menus (when a tty exists)" "reachable" "reachable"
else
  print -r -- "skip opt-in reachability (no controlling terminal in this environment)"
fi

# a binary without the `menu` subcommand keeps the old report-and-block path
fake <<'EOF'
#!/bin/sh
exit 1
EOF
_TIRITH_MENU_PROBE=-1
if TIRITH_INTERACTIVE_MENU=1 _tirith_menu_available; then
  check "old binary has no menu" "yes" "no"
else
  check "old binary has no menu" "no" "no"
fi

# stuck receipt: forget clears the guard state, logs it, and re-checks
fake <<'EOF'
#!/bin/sh
case "$1 $2" in
  "menu --help") printf '%s\n' "Usage: tirith menu <block|stuck>"; exit 0 ;;
  "menu stuck") printf '%s\n' "action=forget"; exit 0 ;;
  *) exit 0 ;;
esac
EOF
_TIRITH_UNRESOLVED_RECEIPT=deadbeef
_TIRITH_UNRESOLVED_RECEIPT_CWD=/nope
_TIRITH_MENU_PROBE=-1
: >"$ZLE_LOG"
_tirith_stuck_menu
check "forget clears the unresolved receipt" "${_TIRITH_UNRESOLVED_RECEIPT:-cleared}" "cleared"
check "forget logs the escape hatch" "$(count 'stuck-receipt-forgot' "$BYPASS_LOG")" "1"

rm -rf "$tmp"
if (( fail )); then
  print -r -- "FAILED"
  exit 1
fi
print -r -- "all hook menu checks passed"
