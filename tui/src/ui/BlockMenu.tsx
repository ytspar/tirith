// Tirith gate UI: shown when the shell wrapper intercepts a blocked command.
// Actions: proceed (logged bypass), edit in place, adopt suggestion, expand "why",
// hand off to Pi for a safe alternative, or cancel. Reports via onDecision, then exits.

import { Box, useApp, useInput } from 'ink';
import { useState } from 'react';
import type { BlockDecision } from '../decision';
import { Text } from './Text';
import { theme } from './theme';

export interface BlockMenuProps {
  command: string;
  /** Multiline text from Tirith's own block report. */
  reason: string;
  /** Optional safer command suggested by policy / a prior review. */
  suggestion?: string;
  /** Bypass log path, shown in the why pane. */
  logPath?: string;
  onDecision: (decision: BlockDecision) => void;
}

type ActionId = 'proceed' | 'edit' | 'suggest' | 'why' | 'ask-pi' | 'cancel';

interface Action {
  id: ActionId;
  label: string;
  key: string;
}

export function BlockMenu({ command, reason, suggestion, logPath, onDecision }: BlockMenuProps) {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null); // null = menu mode

  const actions: Action[] = [
    { id: 'proceed', label: 'proceed once — run this command, logged', key: 'p' },
    { id: 'edit', label: 'edit — change it in place', key: 'e' },
    {
      id: 'suggest',
      label: suggestion ? 'use suggestion — adopt the safer command' : 'suggest — ask tirith for a fix',
      key: 's',
    },
    { id: 'why', label: showWhy ? 'why — hide the reason' : 'why — show the reason', key: 'w' },
    { id: 'ask-pi', label: 'ask Pi — propose a safe alternative', key: 'a' },
    { id: 'cancel', label: 'cancel — keep it in the buffer', key: 'q' },
  ];
  const active = Math.min(cursor, actions.length - 1);

  const decide = (d: BlockDecision) => {
    onDecision(d);
    exit();
  };

  const runAction = (id: ActionId) => {
    switch (id) {
      case 'proceed':
        return decide({ action: 'proceed' });
      case 'edit':
        return setDraft(command);
      case 'suggest':
        return suggestion ? setDraft(suggestion) : decide({ action: 'suggest' });
      case 'why':
        return setShowWhy((v) => !v);
      case 'ask-pi':
        return decide({ action: 'ask-pi' });
      case 'cancel':
        return decide({ action: 'cancel' });
    }
  };

  useInput((input, key) => {
    if (draft != null) {
      if (key.escape) return setDraft(null);
      if (key.return) return decide({ action: 'edit', command: draft });
      if (key.backspace || key.delete) return setDraft((s) => (s ?? '').slice(0, -1));
      if (key.upArrow || key.downArrow || key.ctrl || key.meta) return;
      if (input) return setDraft((s) => (s ?? '') + input);
      return;
    }
    if (key.escape || (key.ctrl && input === 'c')) return decide({ action: 'cancel' });
    if (key.return) return runAction(actions[active].id);
    if (key.upArrow) return setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) return setCursor((c) => Math.min(actions.length - 1, c + 1));
    const byKey = actions.find((a) => a.key === input.toLowerCase());
    if (byKey) return runAction(byKey.id);
  });

  if (draft != null) {
    return (
      <Box flexDirection="column">
        <Header badge="edit command" />
        <Box borderStyle="round" borderColor={theme.border} flexDirection="column">
          <Box>
            <Text color={theme.brand}>{'> '}</Text>
            <Text>{draft}</Text>
            <Text color={theme.brand}>▏</Text>
          </Box>
        </Box>
        <Text dimColor>enter to accept · esc to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header badge="command blocked" />
      <Box borderStyle="round" borderColor={theme.warning} flexDirection="column">
        <Box>
          <Text color={theme.muted}>{'$ '}</Text>
          <Text>{command}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          {reason.split('\n').map((line) => (
            <Text key={line} dimColor>
              {line}
            </Text>
          ))}
        </Box>
        {showWhy && (
          <Box marginTop={1} flexDirection="column">
            <Text color={theme.info}>why</Text>
            <Text dimColor>
              Tirith matched this command against a local policy and refused to run it. Policies cover curl
              piped into a shell, destructive tools, and writes outside the project. Nothing has run yet.
            </Text>
            {logPath && <Text dimColor>Bypasses are appended to {logPath}</Text>}
          </Box>
        )}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {actions.map((a, i) => (
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

function Header({ badge }: { badge: string }) {
  return (
    <Box marginBottom={1}>
      <Text bold color={theme.brand}>
        tirith
      </Text>
      <Text dimColor>{`  ${badge}`}</Text>
    </Box>
  );
}
