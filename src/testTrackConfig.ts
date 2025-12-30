import Assignment from './assignment';
import Split from './split';
import SplitRegistry from './splitRegistry';

const DEFAULT_VISITOR_COOKIE_NAME = 'tt_visitor_id';
let config: RawConfig | null = null;
let assignments: Assignment[] | null = null;
let registry: SplitRegistry | null = null;

declare global {
  interface Window {
    TT: string;
  }
}

export type RawConfig = {
  assignments: {
    [splitName: string]: string;
  };
  cookieDomain: string;
  cookieName?: string;
  experienceSamplingWeight: number;
  splits: {
    [splitName: string]: {
      feature_gate: boolean;
      weights: {
        [variant: string]: number;
      };
    };
  };
  url: string;
};

const getConfig = function (): RawConfig {
  if (!config) {
    const decodedConfig = atob(window.TT);
    if (decodedConfig) return JSON.parse(decodedConfig);
    throw new Error('Unable to parse configuration');
  }
  return config;
};

const TestTrackConfig = {
  _clear: function () {
    config = null;
  },

  getUrl: function () {
    return getConfig().url;
  },

  getCookieDomain: function () {
    return getConfig().cookieDomain;
  },

  getCookieName: function () {
    return getConfig().cookieName || DEFAULT_VISITOR_COOKIE_NAME;
  },

  getExperienceSamplingWeight: function () {
    return getConfig().experienceSamplingWeight;
  },

  getSplitRegistry: function () {
    const rawRegistry = getConfig().splits;

    if (!rawRegistry) {
      return new SplitRegistry(null);
    }

    if (!registry) {
      const splits = Object.keys(rawRegistry).map(function (splitName) {
        const rawSplit = rawRegistry[splitName];
        return new Split(splitName, rawSplit['feature_gate'], rawSplit['weights']);
      });

      registry = new SplitRegistry(splits);
    }

    return registry;
  },

  getAssignments: function () {
    const rawAssignments = getConfig().assignments;

    if (!rawAssignments) {
      return null;
    }

    if (!assignments) {
      assignments = [];
      for (const splitName in rawAssignments) {
        assignments.push(
          new Assignment({
            splitName,
            variant: rawAssignments[splitName],
            isUnsynced: false
          })
        );
      }
    }

    return assignments;
  }
};

export default TestTrackConfig;
