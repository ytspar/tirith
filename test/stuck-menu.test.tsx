import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import type { StuckDecision } from '../src/decision';
import { StuckMenu } from '../src/ui/StuckMenu';
import { press } from './helpers';

function setup() {
  const decisions: StuckDecision[] = [];
  const app = render(<StuckMenu cwd="/Users/ytspar/git/gone-dir" onDecision={(d) => decisions.push(d)} />);
  return { app, decisions };
}

describe('StuckMenu', () => {
  it('shows the stuck cwd', () => {
    const { app } = setup();
    expect(app.lastFrame()).toContain('stuck execution receipt');
    expect(app.lastFrame()).toContain('/Users/ytspar/git/gone-dir');
    app.unmount();
  });

  it('r retries', async () => {
    const { app, decisions } = setup();
    await press(app, 'r');
    expect(decisions).toEqual([{ action: 'retry' }]);
    app.unmount();
  });

  it('f forgets', async () => {
    const { app, decisions } = setup();
    await press(app, 'f');
    expect(decisions).toEqual([{ action: 'forget' }]);
    app.unmount();
  });

  it('q and esc keep blocked', async () => {
    for (const ch of ['q', '\u001B']) {
      const { app, decisions } = setup();
      await press(app, ch);
      expect(decisions).toEqual([{ action: 'quit' }]);
      app.unmount();
    }
  });

  it('arrows + enter select', async () => {
    const { app, decisions } = setup();
    await press(app, '\u001B[B', '\r'); // down to "forget"
    expect(decisions).toEqual([{ action: 'forget' }]);
    app.unmount();
  });
});
