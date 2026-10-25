import { createElement } from 'react';
import { type BlockDecision, type EmitFormat, emitDecision } from '../decision';
import { renderOnTty } from '../tty';
import { BlockMenu } from '../ui/BlockMenu';

export interface BlockOptions {
  cmd: string;
  reason: string;
  suggest?: string;
  logPath?: string;
  emit: EmitFormat;
}

export function blockCommand(opts: BlockOptions): void {
  let decision: BlockDecision | null = null;
  const { app, target } = renderOnTty(
    createElement(BlockMenu, {
      command: opts.cmd,
      reason: opts.reason,
      suggestion: opts.suggest,
      logPath: opts.logPath,
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
