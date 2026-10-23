import { createElement } from 'react';
import { type EmitFormat, emitDecision, type StuckDecision } from '../decision';
import { renderOnTty } from '../tty';
import { StuckMenu } from '../ui/StuckMenu';

export interface StuckOptions {
  cwd: string;
  emit: EmitFormat;
}

export function stuckCommand(opts: StuckOptions): void {
  let decision: StuckDecision | null = null;
  const { app, target } = renderOnTty(
    createElement(StuckMenu, {
      cwd: opts.cwd,
      onDecision: (d) => {
        decision = d;
      },
    }),
  );
  app
    .waitUntilExit()
    .then(() => {
      target.close();
      if (decision) process.stdout.write(`${emitDecision(decision, opts.emit)}\n`);
    })
    .catch(() => {
      target.close();
      process.exitCode = 1;
    });
}
