// Machine-readable decision contract between the TUI and the zsh ZLE widget.
// The widget captures stdout (`decision=$(tirith-menu block --cmd ... </dev/tty)`),
// so the UI must render elsewhere (see tty.ts) and stdout carries ONLY the decision.

export type BlockDecision =
  | { action: 'proceed' }
  | { action: 'edit'; command: string }
  | { action: 'ask-pi' }
  | { action: 'cancel' };

export type StuckDecision = { action: 'retry' | 'forget' | 'quit' };

export type Decision = BlockDecision | StuckDecision;

export type EmitFormat = 'json' | 'zsh';

/** `printf %q`-style single-quote quoting, understood by zsh's `eval`. */
export function zshQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function emitDecision(decision: Decision, format: EmitFormat): string {
  if (format === 'json') return JSON.stringify(decision);
  const entries = Object.entries(decision).map(([k, v]) => `${k}=${zshQuote(String(v))}`);
  return entries.join('\n');
}
