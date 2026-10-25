// Width plumbing for the menus. Ink apps should never assume 80 columns: read the
// real width with useStdout (which re-renders on resize) and clamp it to a
// comfortable reading measure so a wide terminal doesn't stretch rows into a
// rind of empty space.

import { useStdout } from 'ink';

const MIN_WIDTH = 32;
const MAX_WIDTH = 92;
const GUTTER = 2;

export function useLayoutWidth(): number {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  return Math.max(MIN_WIDTH, Math.min(columns - GUTTER, MAX_WIDTH));
}
