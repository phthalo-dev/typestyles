/**
 * Compile-time assertions for recipe var refs inside style objects.
 * Computed custom-property keys (`[vars.background.name]`) stay assignable.
 */
import { createStyles } from './styles';
import { variant } from './variant';
import type { CSSProperties, VariantOptionStyle } from './types';

const styles = createStyles();

function makeSelectedBlock(v: {
  background: { name: string; var: string };
  border: { name: string; var: string };
  foreground: { name: string; var: string };
  selectedBackground: { name: string; var: string };
  selectedForeground: { name: string; var: string };
}): VariantOptionStyle {
  return {
    [v.background.name]: v.selectedBackground.var,
    [v.border.name]: v.selectedBackground.var,
    [v.foreground.name]: v.selectedForeground.var,
    '&:hover': {
      [v.background.name]: '#0055cc',
    },
  };
}

function setVar(name: string, value: string): VariantOptionStyle {
  return { [name]: value };
}

const baseVars = styles.component({
  name: 'vars-base',
  vars: { background: { value: '#fff', syntax: '<color>', inherits: false } },
  styles: ({ vars }) => ({
    base: {
      color: 'black',
      '&[data-expanded]': {
        [vars.background.name]: '#eee',
        display: 'block',
      },
    },
  }),
});

const flatVars = styles.component({
  name: 'vars-flat',
  vars: {
    background: { value: '#fff', syntax: '<color>', inherits: false },
    foreground: { value: '#000', syntax: '<color>', inherits: false },
  },
  variants: { intent: variant.enum(['primary', 'secondary'], { default: 'primary' }) },
  styles: ({ vars }) => ({
    base: { color: vars.foreground.var },
    variants: {
      intent: {
        primary: {
          [vars.background.name]: '#00f',
          [vars.foreground.name]: '#fff',
          color: 'red',
        },
        secondary: {
          [vars.background.name]: '#eee',
          '&:hover': {
            [vars.background.name]: '#ddd',
            opacity: 0.9,
          },
        },
      },
    },
  }),
});
flatVars({ intent: 'primary' });

const stateVars = styles.component({
  name: 'vars-state',
  vars: {
    background: { value: '#fff', syntax: '<color>', inherits: false },
    border: { value: '#ccc', syntax: '<color>', inherits: false },
    foreground: { value: '#000', syntax: '<color>', inherits: false },
    selectedBackground: { value: '#00f', syntax: '<color>', inherits: false },
    selectedForeground: { value: '#fff', syntax: '<color>', inherits: false },
  },
  variants: { selected: variant.boolean({ default: false }) },
  styles: ({ vars }) => ({
    variants: {
      selected: {
        true: { '&[data-selected]': makeSelectedBlock(vars) },
        false: {},
      },
    },
  }),
});
stateVars({ selected: true });

const slotVars = styles.component({
  name: 'vars-slot',
  slots: ['root', 'icon'],
  vars: {
    background: { value: '#fff', syntax: '<color>', inherits: false },
    foreground: { value: '#000', syntax: '<color>', inherits: false },
  },
  variants: { tone: variant.enum(['danger'], { default: 'danger' }) },
  styles: ({ vars }) => ({
    base: { root: { display: 'flex' } },
    variants: {
      tone: {
        danger: {
          root: {
            [vars.background.name]: '#fee',
            [vars.foreground.name]: '#900',
            '&:hover': { [vars.background.name]: '#fcc' },
          },
          icon: { opacity: 1 },
        },
      },
    },
  }),
});
slotVars({ tone: 'danger' });

const multiSlot = styles.component({
  name: 'vars-multi',
  slots: ['root'],
  vars: { background: { value: '#fff', syntax: '<color>', inherits: false } },
  styles: ({ vars }) => ({
    base: {
      root: {
        [vars.background.name]: '#eee',
        '&:hover': { [vars.background.name]: '#ddd' },
      },
    },
  }),
});

function setCssVar(name: string, value: string): CSSProperties {
  return { [name]: value };
}

const directAssign: VariantOptionStyle = {
  color: 'red',
  '&[data-selected]': setVar('--test-bg', 'blue'),
};

const directCssProperties: CSSProperties = {
  color: 'red',
  '&[data-selected]': setCssVar('--test-bg', 'blue'),
};

const utils = styles.withUtils({
  padded: (size: number) => ({ padding: size }),
});

function withUtilsVars(v: { background: { name: string } }): string {
  return utils.class('vars-utils', {
    [v.background.name]: '#eee',
    '&:hover': { [v.background.name]: '#ddd' },
    padded: 8,
  });
}

const slottedVars = styles.component({
  name: 'vars-slotted',
  slots: ['root', 'popover'] as const,
  vars: {
    popoverBackground: {
      value: 'var(--color-surface)',
      syntax: '<color>' as const,
      slots: ['popover'],
    },
  },
  styles: ({ vars }) => ({
    base: {
      popover: { backgroundColor: vars.popoverBackground.var },
    },
  }),
});

void slottedVars;
void baseVars;
void flatVars;
void stateVars;
void slotVars;
void multiSlot;
void directAssign;
void directCssProperties;
void withUtilsVars;
