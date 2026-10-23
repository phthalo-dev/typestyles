import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test';
import {
  insertRule,
  insertRules,
  getRegisteredCss,
  subscribeRegisteredCss,
  reset,
  flushSync,
  ensureDocumentStylesAttached,
  TYPESTYLES_STYLE_ID,
  TYPESTYLES_FALLBACK_STYLE_ID,
} from './sheet';
import { registeredNamespaces } from './registry';

describe('subscribeRegisteredCss', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('notifies listeners when a rule is registered', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRegisteredCss(listener);

    insertRule('.a', '.a { color: red; }');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getRegisteredCss()).toContain('.a { color: red; }');

    unsubscribe();
  });

  it('notifies once per insertRules batch', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRegisteredCss(listener);

    insertRules([
      { key: '.a', css: '.a { color: red; }' },
      { key: '.b', css: '.b { color: blue; }' },
    ]);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('does not notify for deduplicated rules', () => {
    insertRule('.a', '.a { color: red; }');

    const listener = vi.fn();
    const unsubscribe = subscribeRegisteredCss(listener);

    insertRule('.a', '.a { color: red; }');
    insertRules([{ key: '.a', css: '.a { color: red; }' }]);
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRegisteredCss(listener);
    unsubscribe();

    insertRule('.a', '.a { color: red; }');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('non-destructive insertRule fallback', () => {
  /** Marker that makes the patched CSSOM insertRule throw, simulating a browser rejecting a rule. */
  const REJECT_MARKER = '--ts-reject-me';
  const realInsertRule = window.CSSStyleSheet.prototype.insertRule;

  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
    vi.spyOn(window.CSSStyleSheet.prototype, 'insertRule').mockImplementation(function (
      this: CSSStyleSheet,
      rule: string,
      index?: number,
    ) {
      if (rule.includes(REJECT_MARKER)) {
        throw new DOMException('invalid rule', 'SyntaxError');
      }
      return realInsertRule.call(this, rule, index);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    reset();
  });

  function mainEl(): HTMLStyleElement {
    return document.getElementById(TYPESTYLES_STYLE_ID) as HTMLStyleElement;
  }

  function fallbackEl(): HTMLStyleElement | null {
    return document.getElementById(TYPESTYLES_FALLBACK_STYLE_ID) as HTMLStyleElement | null;
  }

  it('keeps previously inserted CSSOM rules when a later rule is rejected', () => {
    insertRule('.ok', '.ok { color: red; }');
    flushSync();
    expect(mainEl().sheet!.cssRules.length).toBe(1);

    insertRule('.bad', `@property ${REJECT_MARKER} { syntax: "<color>"; }`);
    flushSync();

    // Previously inserted rule must survive the rejected one.
    expect(mainEl().sheet!.cssRules.length).toBe(1);
    expect(mainEl().sheet!.cssRules[0].cssText).toContain('.ok');
  });

  it('routes rejected rules to a separate fallback element, never as text on the main element', () => {
    insertRule('.ok2', '.ok2 { color: blue; }');
    insertRule('.bad2', `.bad2 { color: ${REJECT_MARKER}; }`);
    flushSync();

    expect(mainEl().childNodes.length).toBe(0);
    const fallback = fallbackEl();
    expect(fallback).not.toBeNull();
    expect(fallback!.textContent).toContain(REJECT_MARKER);
    expect(fallback!.textContent).not.toContain('.ok2 {');
  });

  it('doc-swap rewrite (detached main element) stays non-destructive', () => {
    insertRule('.ok3', '.ok3 { color: green; }');
    insertRule('.bad3', `.bad3 { color: ${REJECT_MARKER}; }`);
    flushSync();

    // Simulate an SPA head swap detaching both managed elements.
    mainEl().remove();
    fallbackEl()?.remove();
    ensureDocumentStylesAttached();

    expect(mainEl().sheet!.cssRules.length).toBe(1);
    expect(mainEl().sheet!.cssRules[0].cssText).toContain('.ok3');
    expect(mainEl().childNodes.length).toBe(0);
    expect(fallbackEl()!.textContent).toContain(REJECT_MARKER);
  });

  it('places the fallback element immediately after the main element', () => {
    insertRule('.bad4', `.bad4 { color: ${REJECT_MARKER}; }`);
    flushSync();
    expect(mainEl().nextElementSibling).toBe(fallbackEl());
  });
});
