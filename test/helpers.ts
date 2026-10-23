import type { render } from 'ink-testing-library';

// Ink subscribes to stdin inside useEffect, which React 18 schedules asynchronously —
// so a write immediately after render() lands nowhere. Settle with a tick before the
// first write (and between writes that depend on re-rendered state).
const tick = () => new Promise((resolve) => setTimeout(resolve, 15));

export async function press(app: ReturnType<typeof render>, ...keys: string[]): Promise<void> {
  await tick();
  for (const key of keys) {
    app.stdin.write(key);
    await tick();
  }
}
