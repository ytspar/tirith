// Tirith gate UI: shown when the shell wrapper intercepts a blocked command.
// Actions: proceed (logged bypass), edit in place, adopt suggestion, expand "why",
// hand off to Pi for a safe alternative, or cancel. Reports via onDecision, then exits.

import figures from 'figures';
import { Box, useApp, useInput } from 'ink';
import { useState } from 'react';
import type { BlockDecision } from '../decision';
import { ActionRow, Header, Hint, Panel } from './chrome';
import { useLayoutWidth } from './layout';
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
  hotkey: string;
  /** Extra keys that also trigger it (esc/q both cancel). */
  aliases?: string[];
}

/** Tirith's report is longer than the menu needs; keep the panel to one screen. */
const MAX_REPORT_LINES = 8;

/**
 * Prepare Tirith's report for the panel: drop its own `tirith: BLOCKED` banner (the
 * header already says that) and the report's common left indent, which would otherwise
 * stack on top of the panel's own padding.
 */
export function reportLines(reason: string): string[] {
  const all = reason.split('\n').map((line) => line.replace(/\s+$/, ''));
  if (all.length > 0 && /^tirith\b/.test(all[0].trim())) all.shift();
  while (all.length > 0 && all[0].trim() === '') all.shift();
  while (all.length > 0 && all[all.length - 1].trim() === '') all.pop();
  const indent = Math.min(
    ...all.filter((line) => line.trim() !== '').map((line) => line.match(/^ */)?.[0].length ?? 0),
  );
  return Number.isFinite(indent) ? all.map((line) => line.slice(indent)) : all;
}

export function BlockMenu({ command, reason, suggestion, logPath, onDecision }: BlockMenuProps) {
  const { exit } = useApp();
  const width = useLayoutWidth();
  const [cursor, setCursor] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null); // null = menu mode

  const actions: Action[] = [
    { id: 'proceed', label: 'run it once, logged', hotkey: 'p' },
    { id: 'edit', label: 'edit the command', hotkey: 'e' },
    {
      id: 'suggest',
      label: suggestion ? 'use the suggestion' : 'ask tirith for a safer command',
      hotkey: 's',
    },
    { id: 'why', label: showWhy ? 'hide why' : 'why was this blocked', hotkey: 'w' },
    { id: 'ask-pi', label: 'ask pi for an alternative', hotkey: 'a' },
    { id: 'cancel', label: 'cancel, keep it in the buffer', hotkey: 'esc', aliases: ['q'] },
  ];
  const active = Math.min(cursor, actions.length - 1);
  const lines = reportLines(reason);
  // Reports can repeat a line verbatim, so key by occurrence rather than by content.
  const occurrences = new Map<string, number>();
  const shown = (showWhy ? lines : lines.slice(0, MAX_REPORT_LINES)).map((line) => {
    const seen = (occurrences.get(line) ?? 0) + 1;
    occurrences.set(line, seen);
    return { line, key: `${line}#${seen}` };
  });
  const hidden = lines.length - shown.length;

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
      if (key.ctrl && input === 'u') return setDraft('');
      if (key.upArrow || key.downArrow || key.ctrl || key.meta) return;
      if (input) return setDraft((s) => (s ?? '') + input);
      return;
    }
    if (key.escape || (key.ctrl && input === 'c')) return decide({ action: 'cancel' });
    if (key.return) return runAction(actions[active].id);
    if (key.upArrow) return setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) return setCursor((c) => Math.min(actions.length - 1, c + 1));
    const needle = input.toLowerCase();
    const byKey = actions.find((a) => a.hotkey === needle || a.aliases?.includes(needle));
    if (byKey) return runAction(byKey.id);
  });

  if (draft != null) {
    return (
      <Box flexDirection="column" width={width}>
        <Header glyph={figures.pointer} badge="edit command" />
        <Panel width={width}>
          <Box>
            <Text color={theme.muted}>{'$ '}</Text>
            <Text wrap="truncate-start">{draft}</Text>
            <Text color={theme.brand} inverse>
              {' '}
            </Text>
          </Box>
        </Panel>
        <Hint width={width}>{'[enter] run it · [esc] back · [⌫] delete · [ctrl+u] clear'}</Hint>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width}>
      <Header glyph={figures.cross} tone={theme.danger} badge="command blocked" />
      <Panel width={width}>
        <Box>
          <Text color={theme.muted}>{'$ '}</Text>
          <Text bold wrap="truncate-end">
            {command}
          </Text>
        </Box>
        {shown.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            {shown.map(({ line, key }) => (
              <Text key={key} dimColor wrap="wrap">
                {line}
              </Text>
            ))}
            {hidden > 0 && (
              <Text dimColor>
                {`${figures.ellipsis} ${hidden} more line${hidden === 1 ? '' : 's'}, [w] for the full report`}
              </Text>
            )}
          </Box>
        )}
        {suggestion && !showWhy && (
          <Box marginTop={1}>
            <Text color={theme.success} wrap="truncate-end">
              {`${figures.arrowRight} ${suggestion}`}
            </Text>
          </Box>
        )}
        {showWhy && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.info}>why</Text>
            <Text dimColor wrap="wrap">
              tirith matched this command against a local policy and refused to run it. Policies cover curl
              piped into a shell, destructive tools and writes outside the project. Nothing has run yet.
            </Text>
            {logPath && <Text dimColor wrap="wrap">{`bypasses are appended to ${logPath}`}</Text>}
          </Box>
        )}
      </Panel>
      <Box flexDirection="column" marginTop={1} width={width}>
        {actions.map((a, i) => (
          <ActionRow key={a.id} selected={i === active} label={a.label} hotkey={a.hotkey} width={width} />
        ))}
      </Box>
      <Hint width={width}>{'[↑↓] move · [enter] select · [letters] shortcuts'}</Hint>
    </Box>
  );
}
