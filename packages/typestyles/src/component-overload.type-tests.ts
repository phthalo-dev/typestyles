/**
 * The object recipe has one signature. These are the cases that used to fall
 * through an overload (Issue #275).
 */
import { createStyles } from './styles';
import { variant } from './variant';

const styles = createStyles();

const aspectRatio = styles.component({
  name: 'aspect-ratio',
  vars: { ratio: { syntax: '*', value: '16 / 9' } },
  styles: ({ vars }) => ({
    base: {
      position: 'relative',
      aspectRatio: vars.ratio.var,
      '& > *': { position: 'absolute', inset: 0 },
    },
  }),
});
void aspectRatio().className;
void aspectRatio().attrs;
void aspectRatio().props;
void aspectRatio.vars.ratio;
// @ts-expect-error — ratio is the only declared var
void aspectRatio.vars.missing;

const contents = styles.component({
  name: 'contents',
  styles: { base: { display: 'contents' } },
});
void contents().className;
// @ts-expect-error — no vars were declared
void contents.vars;

const _missingVar = styles.component({
  name: 'missing-var',
  vars: { ratio: '16 / 9' },
  styles: ({ vars }) => ({
    // @ts-expect-error — `missing` was not declared
    base: { color: vars.missing.var },
  }),
});
void _missingVar;

const toc = styles.component({
  name: 'toc',
  slots: ['root', 'title'],
  styles: {
    base: {
      root: { top: '0' },
      title: { color: 'CanvasText' },
    },
  },
});
void toc().root.className;
void toc().title.props;
const tocRoot: string = toc.root;
const tocTitle: string = toc.title;
void tocRoot;
void tocTitle;
// @ts-expect-error — `missing` is not a declared slot
void toc.missing;

// @ts-expect-error — '& > *' is a selector, not a slot
const _selectorBesideRoot = styles.component({
  name: 'selector-beside-root',
  slots: ['root'],
  styles: {
    base: {
      root: { position: 'relative' },
      '& > *': { position: 'absolute' },
    },
  },
});
void _selectorBesideRoot;

const tone = variant.enum(['neutral', 'accent'], { default: 'neutral' });
const button = styles.component({
  name: 'button',
  variants: { tone },
  styles: {
    base: { color: 'CanvasText' },
    variants: {
      tone: { neutral: {}, accent: {} },
    },
  },
});
// @ts-expect-error — "ghost" is not a tone
button({ tone: 'ghost' });
