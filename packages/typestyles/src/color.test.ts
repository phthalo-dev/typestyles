import { describe, it, expect } from 'vite-plus/test';
import {
  rgb,
  hsl,
  oklch,
  oklab,
  lab,
  lch,
  hwb,
  mix,
  lightDark,
  alpha,
  from,
  rgbFrom,
  oklchFrom,
  lighten,
  darken,
  saturate,
  desaturate,
  rotate,
  grayscale,
} from './color';

describe('rgb', () => {
  it('produces rgb() without alpha', () => {
    expect(rgb(0, 102, 255)).toBe('rgb(0 102 255)');
  });

  it('produces rgb() with alpha', () => {
    expect(rgb(0, 102, 255, 0.5)).toBe('rgb(0 102 255 / 0.5)');
  });

  it('works with percentage values', () => {
    expect(rgb('0%', '40%', '100%')).toBe('rgb(0% 40% 100%)');
  });
});

describe('hsl', () => {
  it('produces hsl() without alpha', () => {
    expect(hsl(220, '100%', '50%')).toBe('hsl(220 100% 50%)');
  });

  it('produces hsl() with alpha', () => {
    expect(hsl(220, '100%', '50%', 0.8)).toBe('hsl(220 100% 50% / 0.8)');
  });
});

describe('oklch', () => {
  it('produces oklch() without alpha', () => {
    expect(oklch(0.7, 0.15, 250)).toBe('oklch(0.7 0.15 250)');
  });

  it('produces oklch() with alpha', () => {
    expect(oklch(0.7, 0.15, 250, 0.5)).toBe('oklch(0.7 0.15 250 / 0.5)');
  });
});

describe('oklab', () => {
  it('produces oklab() without alpha', () => {
    expect(oklab(0.7, -0.1, -0.1)).toBe('oklab(0.7 -0.1 -0.1)');
  });

  it('produces oklab() with alpha', () => {
    expect(oklab(0.7, -0.1, -0.1, 0.5)).toBe('oklab(0.7 -0.1 -0.1 / 0.5)');
  });
});

describe('lab', () => {
  it('produces lab()', () => {
    expect(lab('50%', 40, -20)).toBe('lab(50% 40 -20)');
  });

  it('produces lab() with alpha', () => {
    expect(lab('50%', 40, -20, 0.7)).toBe('lab(50% 40 -20 / 0.7)');
  });
});

describe('lch', () => {
  it('produces lch()', () => {
    expect(lch('50%', 80, 250)).toBe('lch(50% 80 250)');
  });

  it('produces lch() with alpha', () => {
    expect(lch('50%', 80, 250, 0.9)).toBe('lch(50% 80 250 / 0.9)');
  });
});

describe('hwb', () => {
  it('produces hwb()', () => {
    expect(hwb(220, '10%', '0%')).toBe('hwb(220 10% 0%)');
  });

  it('produces hwb() with alpha', () => {
    expect(hwb(220, '10%', '0%', 0.6)).toBe('hwb(220 10% 0% / 0.6)');
  });
});

describe('mix', () => {
  it('mixes two colors in srgb by default', () => {
    expect(mix('red', 'blue')).toBe('color-mix(in srgb, red, blue)');
  });

  it('mixes with a percentage', () => {
    expect(mix('red', 'blue', 30)).toBe('color-mix(in srgb, red 30%, blue)');
  });

  it('supports custom color spaces', () => {
    expect(mix('red', 'blue', 50, 'oklch')).toBe('color-mix(in oklch, red 50%, blue)');
  });

  it('works with token references (var() strings)', () => {
    const tokenRef = 'var(--color-primary)';
    expect(mix(tokenRef, 'white', 20)).toBe('color-mix(in srgb, var(--color-primary) 20%, white)');
  });

  it('supports all modern color spaces', () => {
    expect(mix('red', 'blue', 50, 'oklab')).toBe('color-mix(in oklab, red 50%, blue)');
    expect(mix('red', 'blue', 50, 'display-p3')).toBe('color-mix(in display-p3, red 50%, blue)');
  });
});

describe('lightDark', () => {
  it('produces light-dark()', () => {
    expect(lightDark('#111', '#eee')).toBe('light-dark(#111, #eee)');
  });

  it('works with token references', () => {
    expect(lightDark('var(--light)', 'var(--dark)')).toBe('light-dark(var(--light), var(--dark))');
  });
});

describe('alpha', () => {
  it('adjusts opacity using color-mix with transparent', () => {
    expect(alpha('red', 0.5)).toBe('color-mix(in srgb, red 50%, transparent)');
  });

  it('works with token references', () => {
    expect(alpha('var(--color-primary)', 0.2)).toBe(
      'color-mix(in srgb, var(--color-primary) 20%, transparent)',
    );
  });

  it('supports custom color spaces', () => {
    expect(alpha('#0066ff', 0.8, 'oklch')).toBe('color-mix(in oklch, #0066ff 80%, transparent)');
  });

  it('handles full opacity', () => {
    expect(alpha('red', 1)).toBe('color-mix(in srgb, red 100%, transparent)');
  });

  it('handles zero opacity', () => {
    expect(alpha('red', 0)).toBe('color-mix(in srgb, red 0%, transparent)');
  });
});

describe('from', () => {
  const spaces = ['rgb', 'hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch'] as const;

  it.each(spaces)('produces %s(from …) without alpha', (space) => {
    expect(from(space, 'red', 'a b c')).toBe(`${space}(from red a b c)`);
  });

  it.each(spaces)('produces %s(from …) with alpha', (space) => {
    expect(from(space, 'red', 'a b c', 0.5)).toBe(`${space}(from red a b c / 0.5)`);
  });

  it('supports calc() inside components', () => {
    expect(from('oklch', 'var(--primary)', 'calc(l - 0.1) c h')).toBe(
      'oklch(from var(--primary) calc(l - 0.1) c h)',
    );
  });
});

describe('rgbFrom', () => {
  it('passes through channel keywords', () => {
    expect(rgbFrom('var(--primary)', 'r', 'g', 'b')).toBe('rgb(from var(--primary) r g b)');
  });

  it('supports numeric channels and alpha', () => {
    expect(rgbFrom('#0066ff', 0, 102, 255, 0.5)).toBe('rgb(from #0066ff 0 102 255 / 0.5)');
  });

  it('supports calc() on a channel', () => {
    expect(rgbFrom('var(--primary)', 'calc(r * 0.9)', 'g', 'b')).toBe(
      'rgb(from var(--primary) calc(r * 0.9) g b)',
    );
  });
});

describe('oklchFrom', () => {
  it('passes through channel keywords', () => {
    expect(oklchFrom('var(--primary)', 'l', 'c', 'h')).toBe('oklch(from var(--primary) l c h)');
  });

  it('supports calc() on lightness', () => {
    expect(oklchFrom('var(--primary)', 'calc(l - 0.1)', 'c', 'h')).toBe(
      'oklch(from var(--primary) calc(l - 0.1) c h)',
    );
  });

  it('supports alpha', () => {
    expect(oklchFrom('var(--primary)', 'l', 'c', 'h', 0.5)).toBe(
      'oklch(from var(--primary) l c h / 0.5)',
    );
  });
});

describe('OKLCH manipulation sugar', () => {
  const token = 'var(--theme-primary)';

  it('lighten', () => {
    expect(lighten(token, 0.1)).toBe('oklch(from var(--theme-primary) calc(l + 0.1) c h)');
    expect(lighten(token, '10%')).toBe('oklch(from var(--theme-primary) calc(l + 10%) c h)');
  });

  it('darken', () => {
    expect(darken(token, 0.1)).toBe('oklch(from var(--theme-primary) calc(l - 0.1) c h)');
    expect(darken(token, '10%')).toBe('oklch(from var(--theme-primary) calc(l - 10%) c h)');
  });

  it('saturate', () => {
    expect(saturate(token, 1.2)).toBe('oklch(from var(--theme-primary) l calc(c * 1.2) h)');
  });

  it('desaturate', () => {
    expect(desaturate(token, 0.5)).toBe('oklch(from var(--theme-primary) l calc(c * 0.5) h)');
  });

  it('rotate', () => {
    expect(rotate(token, 30)).toBe('oklch(from var(--theme-primary) l c calc(h + 30))');
    expect(rotate(token, '30deg')).toBe('oklch(from var(--theme-primary) l c calc(h + 30deg))');
  });

  it('grayscale', () => {
    expect(grayscale(token)).toBe('oklch(from var(--theme-primary) l 0 h)');
  });
});
