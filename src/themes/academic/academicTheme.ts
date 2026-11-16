import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

// Extend the maintained package; this is not an ejected source fork.
export const academicTheme = defineTheme({
  name: 'academic',
  extends: neutralTheme,
  localTokens: {
    '--embedgym-content-width': '75rem',
    '--embedgym-signal': '#b85b22',
    '--embedgym-verified': '#16745b',
    '--embedgym-code-height': '28rem',
    '--embedgym-part-height': '4.5rem',
    '--embedgym-part-width': '8rem',
    '--embedgym-board-height': '10rem',
  },
  tokens: {
    '--color-accent': '#245ec7',
    '--color-text-accent': '#245ec7',
    '--color-accent-muted': '#eaf1ff',
    '--color-background-body': 'white',
    '--color-background-surface': 'white',
    '--color-background-card': 'white',
    '--color-background-popover': 'white',
  },
  components: {
    heading: {'type:display-1': {letterSpacing: '-0.035em'}},
  },
});
