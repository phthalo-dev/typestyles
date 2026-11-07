/**
 * Compile-only check: build-runner's copies of the plan types must stay identical to the ones
 * `typestyles` records. If either side gains or changes a plan kind, one of these fails.
 */
import type { AttrsRecipePlan, ClientPlanEntry as RuntimeClientPlanEntry } from 'typestyles';
import type { ClientPlanEntry, ClientRecipePlan } from './index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const plansMatch: Equal<ClientRecipePlan, AttrsRecipePlan> = true;
const entriesMatch: Equal<ClientPlanEntry, RuntimeClientPlanEntry> = true;

export { plansMatch, entriesMatch };
