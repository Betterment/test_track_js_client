import type { Assignment } from './visitor';
import { type Split, createSplitRegistry, type SplitRegistry } from './splitRegistry';

declare global {
  interface Window {
    TT?: string;
  }
}

type ConfigSplit = Readonly<{
  feature_gate: boolean;
  weights: Readonly<{ [variant: string]: number }>;
}>;

export type Config = Readonly<{
  url: string;
  cookieDomain: string;
  cookieName?: string;
  experienceSamplingWeight: number;
  assignments?: Readonly<{ [splitName: string]: string }> | null;
  splits?: Readonly<{ [splitName: string]: ConfigSplit }> | null;
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

export function parseAssignments(rawAssignments: Config['assignments']): Assignment[] {
  return Object.entries(rawAssignments || []).map(([splitName, variant]) => ({ splitName, variant, context: null }));
}

export function loadConfig(): Config {
  try {
    return JSON.parse(atob(window.TT!)) as Config;
  } catch {
    throw new Error('Unable to parse configuration');
  }
}
