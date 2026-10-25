// Tirith stuck-receipt UI: a previous execution receipt cannot be resolved, so the
// hook is refusing every command. Actions: retry resolution, forget the stuck receipt
// (logged, then the pending command is re-checked), or stay blocked.

import { Box, useApp, useInput } from 'ink';
import { useState } from 'react';
import type { StuckDecision } from '../decision';
import { ActionRow, Header, Hint, Panel } from './chrome';
import { useLayoutWidth } from './layout';
import { Text } from './Text';
import { theme } from './theme';

export interface StuckMenuProps {
  /** The cwd recorded on the stuck receipt (why reconcile/discard keep failing). */
  cwd: string;
  onDecision: (decision: StuckDecision) => void;
}

interface StuckAction {
  id: StuckDecision['action'];
  label: string;
  hotkey: string;
  aliases?: string[];
}

const ACTIONS: StuckAction[] = [
  { id: 'retry', label: 'retry resolution', hotkey: 'r' },
  { id: 'forget', label: 'forget the stuck receipt and recheck this command', hotkey: 'f' },
  { id: 'quit', label: 'stay blocked', hotkey: 'esc', aliases: ['q'] },
];

export function StuckMenu({ cwd, onDecision }: StuckMenuProps) {
  const { exit } = useApp();
  const width = useLayoutWidth();
  const [cursor, setCursor] = useState(0);
  const active = Math.min(cursor, ACTIONS.length - 1);

  const decide = (d: StuckDecision) => {
    onDecision(d);
    exit();
  };

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) return decide({ action: 'quit' });
    if (key.return) return decide({ action: ACTIONS[active].id });
    if (key.upArrow) return setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) return setCursor((c) => Math.min(ACTIONS.length - 1, c + 1));
    const needle = input.toLowerCase();
    const byKey = ACTIONS.find((a) => a.hotkey === needle || a.aliases?.includes(needle));
    if (byKey) return decide({ action: byKey.id });
  });

  return (
    <Box flexDirection="column" width={width}>
      <Header glyph="!" tone={theme.warning} badge="stuck execution receipt" />
      <Panel width={width}>
        <Text wrap="wrap">
          A previous execution receipt could not be resolved, so tirith refuses to run anything until it is
          cleared.
        </Text>
        <Box marginTop={1}>
          <Text dimColor>{'receipt cwd  '}</Text>
          <Text color={theme.warning} wrap="truncate-end">
            {cwd}
          </Text>
        </Box>
        <Text dimColor wrap="wrap">
          that directory is gone, so every reconcile keeps failing
        </Text>
      </Panel>
      <Box flexDirection="column" marginTop={1} width={width}>
        {ACTIONS.map((a, i) => (
          <ActionRow key={a.id} selected={i === active} label={a.label} hotkey={a.hotkey} width={width} />
        ))}
      </Box>
      <Hint width={width}>{'[↑↓] move · [enter] select · [letters] shortcuts'}</Hint>
    </Box>
  );
}
