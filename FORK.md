# Our tirith fork

`origin` is [ytspar/tirith](https://github.com/ytspar/tirith), a fork of
[sheeki03/tirith](https://github.com/sheeki03/tirith). This file is fork-only: it is
not meant to go upstream, and it is the one place that describes how the two repos
fit together.

## Remotes and branches

| remote     | repo                              | push |
| ---------- | --------------------------------- | ---- |
| `upstream` | `github.com/sheeki03/tirith`      | no   |
| `origin`   | `github.com/ytspar/tirith`        | yes  |

- `main` — a pristine mirror of `upstream/main`. Never commit here; `git fetch
  upstream && git checkout main && git reset --hard upstream/main && git push origin
  main` keeps the fork's default branch honest.
- `fork/main` — **the branch we build**. Upstream `main` plus the patches below. This
  is what `cargo install` / dotfiles builds from.
- topic branches (e.g. `fix/exec-replace-registration`) — one per patch, branched off
  an up-to-date `fork/main`, pushed to `origin`, opened as a PR against
  `sheeki03/tirith`. `fork/main` is the merge of those (or a rebase of them).

## What we carry on top of upstream

1. **`__execution-receipt register --replace`** — lets a shell hook retire the
   capability pair left behind by `exec $SHELL`, which otherwise leaves the session
   permanently in legacy mode. Upstream issue
   [#281](https://github.com/sheeki03/tirith/issues/281), PR
   [#282](https://github.com/sheeki03/tirith/pull/282), branch
   `fix/exec-replace-registration`. Drop it from `fork/main` once it lands upstream.
2. **`tui/`** — the Ink menu binary (`tirith-menu`), imported from
   [ytspar/tirith-menu](https://github.com/ytspar/tirith-menu) with `git subtree`, so
   the terminal UI and the gate it presents evolve in one repo.

Upstream keeps its dev shell hooks in `shell/lib/` and byte-identical copies in
`crates/tirith/assets/shell/lib/` (embedded with `include_str!`). Keep those in step:

```sh
diff -r shell/lib crates/tirith/assets/shell/lib   # must be silent
```

## Syncing with upstream

```sh
./scripts/sync-upstream.sh          # fetch, rebase fork/main onto upstream/main, build+test
./scripts/sync-upstream.sh --push   # ...and push the result
```

It refuses to run on a dirty tree and stops on the first conflict so you can resolve
it by hand. Rebase is deliberate: the patch set is small and we want it to apply to
the current upstream, not to a stale base.

## Building / installing

```sh
cargo build --release -p tirith          # Rust binary
cd tui && pnpm install && pnpm build     # Ink menu binary (dist/index.js)
```

The fork is AGPL-3.0-only (see `LICENSE-AGPL`), like upstream. `tui/` is our own code,
originally MIT in the standalone repo; **the copy inside this repo is distributed
under the repo's AGPL-3.0 terms**, while the standalone repo keeps its MIT license.
If that ever becomes a problem, move `tui/` back out of tree and drive the menu
purely as an external binary.

## Editing the TUI

`tui/` is a subtree of [ytspar/tirith-menu](https://github.com/ytspar/tirith-menu),
and that repo stays canonical: it has its own tests, build and releases, and it is
the thing an installed `tirith-menu` comes from. Work on the UI there, then pull it
in here:

```sh
git subtree pull --prefix=tui ../tirith-menu main -m "Pull the tui"
```

Changes that need the fork binary itself (e.g. new arguments for `tirith menu block`)
get made on both sides: the Rust launcher in `crates/tirith/src/cli/menu.rs` forwards
arguments verbatim, so keep the two CLIs in step.
