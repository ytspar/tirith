// Shared chrome for the menus: the header line, the bordered panel, the selectable
// action rows, and the key-hint footer. Keeping them here is what makes the two
// menus look like one product (and keeps the Ink layout idioms in one place).

import figures from 'figures';
import { Box } from 'ink';
import type { ReactNode } from 'react';
import { Text } from './Text';
import { theme } from './theme';

export function Header({
  glyph,
  tone = theme.brand,
  badge,
}: {
  glyph: string;
  tone?: string;
  badge: string;
}) {
  return (
    <Box marginBottom={1}>
      <Text color={tone}>{`${glyph} `}</Text>
      <Text bold color={theme.brand}>
        tirith
      </Text>
      <Text dimColor>{`  ${badge}`}</Text>
    </Box>
  );
}

export function Panel({
  width,
  tone = theme.border,
  children,
}: {
  width: number;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <Box borderStyle="round" borderColor={tone} flexDirection="column" paddingX={1} width={width}>
      {children}
    </Box>
  );
}

/** One selectable row: pointer, label, right-aligned key cap. */
export function ActionRow({
  selected,
  label,
  hotkey,
  width,
}: {
  selected: boolean;
  label: string;
  hotkey: string;
  width: number;
}) {
  // Labels get a fixed column so the key caps line up in a tidy column instead of
  // drifting to the far edge of a wide terminal.
  const labelWidth = Math.min(Math.max(28, width - 12), 42);
  return (
    <Box>
      <Box width={2}>
        <Text bold color={theme.brand}>
          {selected ? figures.pointer : ' '}
        </Text>
      </Box>
      <Box width={labelWidth} marginRight={2}>
        <Text bold={selected} color={selected ? theme.text : undefined} wrap="truncate-end">
          {label}
        </Text>
      </Box>
      <Text dimColor>{`[${hotkey}]`}</Text>
    </Box>
  );
}

/** Muted `[key] verb · …` footer, entered as a fragment list of hints. */
export function Hint({ width, children }: { width: number; children: ReactNode }) {
  return (
    <Box marginTop={1} width={width}>
      <Text dimColor wrap="truncate-end">
        {children}
      </Text>
    </Box>
  );
}
