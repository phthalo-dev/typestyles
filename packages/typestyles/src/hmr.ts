/**
 * HMR runtime helpers for typestyles.
 *
 * Import from 'typestyles/hmr' — this keeps HMR internals out of the
 * main bundle for production users.
 */
export {
  invalidatePrefix,
  invalidateKeys,
  invalidateOverrideRuleKeys,
  createOverrideHmrSlot,
  type OverrideHmrSlot,
} from '#sheet';
