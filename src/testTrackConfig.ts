import Assignment from './assignment';
import ConfigParser, { Config } from './configParser';
import Split from './split';
import SplitRegistry from './splitRegistry';

const DEFAULT_VISITOR_COOKIE_NAME = 'tt_visitor_id';
let config: Config | null = null;
let assignments: Assignment[] | null = null;
let registry: SplitRegistry | null = null;

const getConfig = function(): Config {
  if (!config) {
    const parser = new ConfigParser();
    config = parser.getConfig();
  }
  return config;
};

const TestTrackConfig = {
  _clear: function() {
    config = null;
  },

  getUrl: function() {
    return getConfig().url;
  },

  getCookieDomain: function() {
    return getConfig().cookieDomain;
  },

  getCookieName: function() {
    return getConfig().cookieName || DEFAULT_VISITOR_COOKIE_NAME;
  },

  getExperienceSamplingWeight: function() {
    return getConfig().experienceSamplingWeight;
  },

  getSplitRegistry: function() {
    const rawRegistry = getConfig().splits;

    if (!rawRegistry) {
      return new SplitRegistry(null);
    }

    if (!registry) {
      const splits = Object.keys(rawRegistry).map(function(splitName) {
        const rawSplit = rawRegistry[splitName];
        return new Split(splitName, rawSplit['feature_gate'], rawSplit['weights']);
      });

      registry = new SplitRegistry(splits);
    }

    return registry;
  },

  getAssignments: function() {
    const rawAssignments = getConfig().assignments;

    if (!rawAssignments) {
      return null;
    }

    if (!assignments) {
      assignments = [];
      for (let splitName in rawAssignments) {
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
