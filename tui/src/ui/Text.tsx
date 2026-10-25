// Drop-in for Ink's <Text> that remaps a bare `dimColor` to the `muted` token at full
// intensity (instead of ANSI faint / SGR 2). Vendored from @enrichlayer/tui-kit
// (DEV-4926), same as claude-tabs. Always use this in ui/** — never import Text from
// 'ink' directly.

import { Text as InkText } from 'ink';
import type { ComponentProps } from 'react';
import { theme } from './theme';

type TextProps = ComponentProps<typeof InkText>;

export function Text({ dimColor, color, ...rest }: TextProps) {
  if (dimColor && color == null) return <InkText color={theme.muted} {...rest} />;
  return <InkText dimColor={dimColor} color={color} {...rest} />;
}
