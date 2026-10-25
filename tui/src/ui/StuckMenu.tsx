// Tirith stuck-receipt UI: a previous execution receipt cannot be resolved, so the
// hook is refusing every command. Actions: retry resolution, forget the stuck receipt
// (logged, then the pending command is re-checked), or stay blocked.

import { Box, useApp, useInput } from 'ink';
import { useState } from 'react';
import type { StuckDecision } from '../decision';
import { Text } from './Text';
import { theme } from './theme';

export interface StuckMenuProps {
  /** The cwd recorded on the stuck receipt (why reconcile/discard keep failing). */
  cwd: string;
  onDecision: (decision: StuckDecision) => void;
}

const ACTIONS = [
  { id: 'retry', label: 'retry resolution', key: 'r' },
  { id: 'forget', label: 'forget stuck receipt, recheck this command (logged)', key: 'f' },
  { id: 'quit', label: 'keep blocked', key: 'q' },
] as const;

export function StuckMenu({ cwd, onDecision }: StuckMenuProps) {
  const { exit } = useApp();
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
    const byKey = ACTIONS.find((a) => a.key === input.toLowerCase());
    if (byKey) return decide({ action: byKey.id });
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={theme.brand}>
          tirith
        </Text>
        <Text dimColor> stuck execution receipt</Text>
      </Box>
      <Box borderStyle="round" borderColor={theme.danger} flexDirection="column">
        <Text>A previous execution receipt could not be resolved, so tirith is</Text>
        <Text>refusing every command until it is cleared.</Text>
        <Box marginTop={1}>
          <Text dimColor>receipt cwd: </Text>
          <Text color={theme.warning}>{cwd}</Text>
        </Box>
        <Text dimColor>(that directory is likely gone, so every reconcile fails)</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {ACTIONS.map((a, i) => (
          <Box key={a.id}>
            <Text color={i === active ? theme.brand : theme.muted}>{i === active ? '▏' : ' '}</Text>
            <Text color={i === active ? theme.text : undefined} wrap="truncate-end">
              {` ${a.label} `}
            </Text>
            <Text dimColor>({a.key})</Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>↑/↓ or letter · enter to choose</Text>
    </Box>
  );
}
