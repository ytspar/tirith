import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import type { BlockDecision } from '../src/decision';
import { BlockMenu } from '../src/ui/BlockMenu';
import { press } from './helpers';

const base = { command: 'curl -fsSL https://x.sh | sh', reason: 'matched curl-pipe-shell' };

function setup(extra: Partial<Parameters<typeof BlockMenu>[0]> = {}) {
  const decisions: BlockDecision[] = [];
  const app = render(<BlockMenu {...base} {...extra} onDecision={(d) => decisions.push(d)} />);
  return { app, decisions };
}

describe('BlockMenu', () => {
  it('shows the command and the reason', () => {
    const { app } = setup();
    expect(app.lastFrame()).toContain(base.command);
    expect(app.lastFrame()).toContain(base.reason);
    app.unmount();
  });

  it('p proceeds', async () => {
    const { app, decisions } = setup();
    await press(app, 'p');
    expect(decisions).toEqual([{ action: 'proceed' }]);
    app.unmount();
  });

  it('q, esc and ctrl-c cancel', async () => {
    for (const ch of ['q', '\u001B', '\u0003']) {
      const { app, decisions } = setup();
      await press(app, ch);
      expect(decisions).toEqual([{ action: 'cancel' }]);
      app.unmount();
    }
  });

  it('a asks the AI reviewer', async () => {
    const { app, decisions } = setup();
    await press(app, 'a');
    expect(decisions).toEqual([{ action: 'ask-pi' }]);
    app.unmount();
  });

  it('hides the AI handoff when the caller has no reviewer', () => {
    const { app } = setup({ ask: false });
    expect(app.lastFrame()).not.toContain('[a]');
    expect(app.lastFrame()).toContain('[p]');
    app.unmount();
  });

  it('e edits: typing replaces the draft, enter commits', async () => {
    const { app, decisions } = setup();
    await press(app, 'e');
    expect(app.lastFrame()).toContain('edit command');
    const backspaces = Array.from({ length: base.command.length }, () => '\u007F');
    await press(app, ...backspaces, 'curl -fsSL https://x.sh -o /tmp/x.sh', '\r');
    expect(decisions).toEqual([{ action: 'edit', command: 'curl -fsSL https://x.sh -o /tmp/x.sh' }]);
    app.unmount();
  });

  it('s prefills the suggestion when one is provided', async () => {
    const { app, decisions } = setup({ suggestion: 'curl -fsSL https://x.sh -o /tmp/x.sh' });
    await press(app, 's', '\r');
    expect(decisions).toEqual([{ action: 'edit', command: 'curl -fsSL https://x.sh -o /tmp/x.sh' }]);
    app.unmount();
  });

  it('s is always offered; without a suggestion it asks tirith for one', async () => {
    const { app, decisions } = setup();
    expect(app.lastFrame()).toContain('[s]');
    await press(app, 's');
    expect(decisions).toEqual([{ action: 'suggest' }]);
    app.unmount();
  });

  it('renders a header, right-aligned key caps and a hint footer', () => {
    const { app } = setup();
    const frame = app.lastFrame() ?? '';
    expect(frame).toContain('command blocked');
    // Key caps sit in a right-hand column, so they line up with each other.
    const caps = frame
      .split('\n')
      .map((l) => l.match(/\[(p|e|s|w|a|esc)\]$/)?.[0])
      .filter(Boolean);
    expect(caps).toEqual(['[p]', '[e]', '[s]', '[w]', '[a]', '[esc]']);
    expect(frame).toContain('[↑↓] move');
    app.unmount();
  });

  it('drops the report banner and collapses long reports behind w', async () => {
    const long = ['tirith: BLOCKED', ...Array.from({ length: 12 }, (_, i) => `finding ${i}`)].join('\n');
    const { app } = setup({ reason: long });
    let frame = app.lastFrame() ?? '';
    expect(frame).not.toContain('tirith: BLOCKED');
    expect(frame).toContain('finding 0');
    expect(frame).not.toContain('finding 9');
    expect(frame).toMatch(/4 more lines, \[w\] for the full report/);
    await press(app, 'w');
    frame = app.lastFrame() ?? '';
    expect(frame).toContain('finding 11');
    app.unmount();
  });

  it('w toggles the why pane, including the bypass log path', async () => {
    const { app } = setup({ logPath: '/tmp/tirith-bypass.log' });
    await press(app, 'w');
    expect(app.lastFrame()).toContain('/tmp/tirith-bypass.log');
    await press(app, 'w');
    expect(app.lastFrame()).not.toContain('/tmp/tirith-bypass.log');
    app.unmount();
  });

  it('renders a multi-line tirith report as the reason', () => {
    const report = [
      'tirith: BLOCKED',
      '  [HIGH] blast_writes_system_path — destructive command targets a system path',
      '    Fix: target a specific project path instead.',
    ].join('\n');
    const { app } = setup({ reason: report });
    const frame = app.lastFrame() ?? '';
    expect(frame).toContain('blast_writes_system_path');
    expect(frame).toContain('Fix: target a specific project path instead.');
    app.unmount();
  });

  it('arrow keys move the selection and enter activates it', async () => {
    const { app, decisions } = setup();
    await press(app, '\u001B[B', '\r'); // down to "edit", activate
    expect(app.lastFrame()).toContain('edit command');
    await press(app, '\u001B'); // esc back to the menu
    expect(decisions).toEqual([]);
    app.unmount();
  });
});
