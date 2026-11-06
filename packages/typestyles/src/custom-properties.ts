import { insertRule, invalidateKeys } from '#sheet';

const selectorMaps = new Map<string, Map<string, string>>();

function selectorKey(selector: string): string {
  return `custom-props:${selector}`;
}

function getOrCreateMap(selector: string): Map<string, string> {
  let map = selectorMaps.get(selector);
  if (!map) {
    map = new Map();
    selectorMaps.set(selector, map);
  }
  return map;
}

export function formatCustomPropertiesCss(
  selector: string,
  properties: Record<string, string>,
): string {
  const body = Object.entries(properties)
    .map(([name, value]) => `${name}: ${value}`)
    .join('; ');
  return `${selector} { ${body}; }`;
}

function emitSelector(selector: string): void {
  const map = selectorMaps.get(selector);
  if (!map || map.size === 0) return;
  const key = selectorKey(selector);
  const props = Object.fromEntries(map.entries());
  const css = formatCustomPropertiesCss(selector, props);
  invalidateKeys([key], []);
  insertRule(key, css);
}

export function registerCustomProperty(name: string, value: string, selector = ':root'): void {
  getOrCreateMap(selector).set(name, value);
  emitSelector(selector);
}

export function registerCustomProperties(
  selector: string,
  properties: Record<string, string | number>,
): void {
  const map = getOrCreateMap(selector);
  for (const [name, value] of Object.entries(properties)) {
    map.set(name, String(value));
  }
  emitSelector(selector);
}

/** @internal Test helper */
export function resetCustomProperties(): void {
  selectorMaps.clear();
}
