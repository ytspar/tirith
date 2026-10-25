# tirith-menu

The interactive menu for [Tirith](https://github.com/sheeki03/tirith)'s shell gate: a
React + [Ink](https://github.com/vadimdemedes/ink) TUI that turns a blocked command
into a decision. It is also vendored into [our tirith fork](https://github.com/ytspar/tirith)
under `tui/`, which is where it is developed against the gate itself.

```console
$ tirith-menu block --cmd "rm -rf ~/Documents" --reason "$(cat report.txt)" --emit zsh
action=proceed
```

## The shell contract

The zsh ZLE wrapper drives the menu, so the process has two channels:

- **The UI renders on `/dev/tty`** (opened fresh when stdin/stdout are not a TTY), so
  the widget can capture stdout with `$(...)` without swallowing the interface.
- **stdout carries exactly one decision**, in one line per field:
  `--emit zsh` prints `action=...` / `command=...` with `printf %q`-style quoting that
  zsh `eval`s directly; `--emit json` prints the same object as JSON.
- `ctrl-c` / `esc` are decisions (`cancel` / `quit`), not exits: the app renders with
  `exitOnCtrlC: false` so the widget always gets an answer.

| command  | decision                                                                  |
| -------- | ------------------------------------------------------------------------- |
| `block`  | `proceed`, `edit` + `command`, `suggest`, `ask-pi`, `cancel`              |
| `stuck`  | `retry`, `forget`, `quit` (an execution receipt that cannot be resolved)  |

## Install

```sh
pnpm install && pnpm build     # dist/index.js, a single ESM entry with deps external
```

`bin` is `tirith-menu`; deps stay external, so link or symlink `dist/index.js` into
`PATH` from the checkout (or run it via its realpath). Node 18+.

## Development

```sh
pnpm test          # ink-testing-library render + keystroke tests
pnpm typecheck
pnpm lint          # biome
pnpm dev -- block --cmd "rm -rf ~/Documents" --reason "blast radius"
```

UI conventions: `<Text>` from `src/ui/Text.tsx` (never from `ink`), width from
`useStdout`-based `useLayoutWidth()` rather than an assumed 80 columns, `figures`
for glyphs (avoid ambiguous-width ones like `⚠`, which renders two cells in some
terminals and shifts the layout), and one shared chrome layer (`src/ui/chrome.tsx`) so
both menus stay visually identical.

Bypass logging, receipt cleanup and everything else with side effects stays in the zsh
wrapper — the menu only reports what the user chose.
