import { describe, expect, it } from 'vitest';
import { emitDecision, zshQuote } from '../src/decision';

describe('zshQuote', () => {
  it('quotes simple words', () => {
    expect(zshQuote('proceed')).toBe("'proceed'");
  });

  it('escapes embedded single quotes', () => {
    expect(zshQuote("it's")).toBe(`'it'\\''s'`);
  });

  it('survives newlines, pipes and dollar signs', () => {
    const s = 'curl -fsSL $URL | sh\nrm -rf ./tmp';
    expect(zshQuote(s)).toBe(`'${s}'`);
  });
});

describe('emitDecision', () => {
  it('emits compact json by default', () => {
    expect(emitDecision({ action: 'proceed' }, 'json')).toBe('{"action":"proceed"}');
  });

  it('emits zsh-eval-able assignments with strict quoting', () => {
    expect(emitDecision({ action: 'edit', command: "echo it's | sh" }, 'zsh')).toBe(
      `action='edit'\ncommand='echo it'\\''s | sh'`,
    );
  });

  it('round-trips through zsh eval for a nasty command', () => {
    // Guardrail: the emitted text must be safe to `eval` in zsh. We assert the
    // structure here; test/zsh-eval.sh asserts the round-trip in a real zsh.
    const command = "printf '%s' 'a b' | tee ~/it's\\ a\\ file; echo $((1+1))";
    const out = emitDecision({ action: 'edit', command }, 'zsh');
    expect(out.startsWith("action='edit'\ncommand='")).toBe(true);
    expect(out.endsWith("'")).toBe(true);
  });
});
