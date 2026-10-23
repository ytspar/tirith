#!/usr/bin/env node
import { Command } from 'commander';
import { blockCommand } from './commands/block';
import { stuckCommand } from './commands/stuck';

const VERSION = '0.1.0';

const program = new Command();
program
  .name('tirith-menu')
  .description('Interactive TUI for the Tirith shell command gate (driven from the zsh ZLE widget)')
  .version(VERSION);

program
  .command('block')
  .requiredOption('--cmd <string>', 'the blocked command')
  .option('--reason <string>', 'why it was blocked', 'blocked by tirith policy check')
  .option('--suggest <string>', 'safer command to prefill the editor with')
  .option('--emit <format>', 'decision format on stdout: json | zsh', 'json')
  .action((opts) =>
    blockCommand({
      cmd: opts.cmd,
      reason: opts.reason,
      suggest: opts.suggest,
      emit: opts.emit,
    }),
  );

program
  .command('stuck')
  .requiredOption('--cwd <string>', 'the cwd recorded on the stuck receipt')
  .option('--emit <format>', 'decision format on stdout: json | zsh', 'json')
  .action((opts) => stuckCommand({ cwd: opts.cwd, emit: opts.emit }));

program.parseAsync(process.argv).catch(() => process.exit(1));
