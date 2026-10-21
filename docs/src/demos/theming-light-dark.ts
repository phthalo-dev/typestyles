import { createTypeStyles } from 'typestyles';

const { recipe, tokens } = createTypeStyles({ scopeId: 'theming-light-dark-demo' });

export const themeColor = tokens.create('theme', {
  text: '#111827',
  textMuted: '#6b7280',
  surface: '#ffffff',
  primary: '#0066ff',
});

export const darkTheme = tokens.createTheme({
  name: 'dark',
  tokens: {
    theme: {
      text: '#e0e0e0',
      textMuted: '#9ca3af',
      surface: '#1a1a2e',
      primary: '#66b3ff',
    },
  },
});

export const card = recipe({
  name: 'demo-card',
  styles: {
    base: {
      padding: '16px 20px',
      borderRadius: '8px',
      border: '1px solid color-mix(in srgb, var(--theme-text) 12%, transparent)',
      backgroundColor: 'var(--theme-surface)',
      color: 'var(--theme-text)',
    },
  },
});

export const demoSourceCode = `export const color = tokens.create('color', {
  text: '#111827',
  surface: '#ffffff',
  primary: '#0066ff',
});

export const darkTheme = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      text: '#e0e0e0',
      surface: '#1a1a2e',
      primary: '#66b3ff',
    },
  },
});

// Apply theme-dark on a wrapper:
<div className={darkTheme.className}>
  <div className={card.base}>Themed surface</div>
</div>`;

export const demoVariants = [
  { id: 'light', label: 'Light', className: '', themeClass: '' },
  { id: 'dark', label: 'Dark', className: darkTheme.className, themeClass: darkTheme.className },
] as const;

export const cardClassName = card.base;
