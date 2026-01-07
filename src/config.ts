import Assignment from './assignment';
import { type Split } from './split';
import { createSplitRegistry, type SplitRegistry } from './splitRegistry';

const DEFAULT_VISITOR_COOKIE_NAME = 'tt_visitor_id';

declare global {
  interface Window {
    TT?: string;
  }
}

export type RawConfig = {
  url: string;
  cookieDomain: string;
  cookieName?: string;
  experienceSamplingWeight: number;
  assignments?: { [splitName: string]: string };
  splits?: {
    [splitName: string]: {
      feature_gate: boolean;
      weights: { [variant: string]: number };
    };
  };
};

export type Config = {
  url: URL;
  cookieDomain: string;
  cookieName: string;
  experienceSamplingWeight: number;
  splitRegistry: SplitRegistry;
  assignments: Assignment[] | null;
};

function parseSplitRegistry(rawSplits: RawConfig['splits']): SplitRegistry {
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

function parseAssignments(rawAssignments: RawConfig['assignments']): Assignment[] | null {
  if (!rawAssignments) {
    return null;
  }

  return Object.entries(rawAssignments).map(([splitName, variant]) => {
    return new Assignment({ splitName, variant, isUnsynced: false });
  });
}

export function parseConfig(rawConfig: RawConfig): Config {
  return {
    url: new URL(rawConfig.url),
    cookieDomain: rawConfig.cookieDomain,
    cookieName: rawConfig.cookieName || DEFAULT_VISITOR_COOKIE_NAME,
    experienceSamplingWeight: rawConfig.experienceSamplingWeight,
    splitRegistry: parseSplitRegistry(rawConfig.splits),
    assignments: parseAssignments(rawConfig.assignments)
  };
}

export function loadConfig(): Config {
  try {
    return parseConfig(JSON.parse(atob(window.TT!)));
  } catch {
    throw new Error('Unable to parse configuration');
  }
}
