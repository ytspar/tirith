// Render-target selection. The shell widget captures stdout, so when stdout is not a
// TTY we render Ink on /dev/tty (fresh fds for read and write) and keep stdout clean
// for the decision line. When run manually in a terminal, render normally.

import fs from 'node:fs';
import tty from 'node:tty';
import { type Instance, render } from 'ink';
import type { ReactNode } from 'react';

export interface RenderTarget {
  stdin: tty.ReadStream;
  stdout: tty.WriteStream;
  /** Close fds we opened ourselves (no-op for the process's own streams). */
  close: () => void;
}

export function resolveRenderTarget(
  stdoutIsTTY: boolean,
  stdinIsTTY: boolean,
  open: typeof fs.openSync = fs.openSync,
): RenderTarget {
  if (stdoutIsTTY && stdinIsTTY) {
    return {
      stdin: process.stdin as tty.ReadStream,
      stdout: process.stdout as tty.WriteStream,
      close: () => {},
    };
  }
  const rfd = open('/dev/tty', 'r');
  const wfd = open('/dev/tty', 'w');
  const stdin = new tty.ReadStream(rfd);
  const stdout = new tty.WriteStream(wfd);
  return {
    stdin,
    stdout,
    close: () => {
      stdin.destroy();
      stdout.destroy();
      try {
        fs.closeSync(rfd);
      } catch {}
      try {
        fs.closeSync(wfd);
      } catch {}
    },
  };
}

export function renderOnTty(node: ReactNode): { app: Instance; target: RenderTarget } {
  const target = resolveRenderTarget(Boolean(process.stdout.isTTY), Boolean(process.stdin.isTTY));
  // Never let Ink's default Ctrl+C handler unmount the app without a decision —
  // the menus treat Ctrl+C as an explicit cancel so the widget always gets output.
  const app = render(node, {
    stdin: target.stdin,
    stdout: target.stdout,
    exitOnCtrlC: false,
    patchConsole: false,
  });
  return { app, target };
}
