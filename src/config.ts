import type { Assignment } from './assignment';
import { type Split, createSplitRegistry, type SplitRegistry } from './splitRegistry';

declare global {
  interface Window {
    TT?: string;
  }
}

export type Config = Readonly<{
  url: string;
  cookieDomain: string;
  cookieName?: string;
  experienceSamplingWeight: number;
  assignments?: Readonly<{ [splitName: string]: string }>;
  splits?: Readonly<{
    [splitName: string]: Readonly<{
      feature_gate: boolean;
      weights: Readonly<{ [variant: string]: number }>;
    }>;
  }>;
}>;

export function parseSplitRegistry(rawSplits: Config['splits']): SplitRegistry {
  if (!rawSplits) {
    return createSplitRegistry(null);
  }

  const splits = Object.entries(rawSplits).map<Split>(([name, values]) => ({
    name,
    isFeatureGate: values.feature_gate,
    weighting: values.weights
  }));

  return createSplitRegistry(splits);
}

export function parseAssignments(rawAssignments: Config['assignments']): Assignment[] | null {
  if (!rawAssignments) {
    return null;
  }

  return Object.entries(rawAssignments).map(([splitName, variant]) => {
    return { splitName, variant, context: null, isUnsynced: false };
  });
}

export function loadConfig(): Config {
  try {
    return JSON.parse(atob(window.TT!)) as Config;
  } catch {
    throw new Error('Unable to parse configuration');
  }
}
