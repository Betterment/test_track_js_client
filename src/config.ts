import Assignment from './assignment';
import Split from './split';
import SplitRegistry from './splitRegistry';

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

export class Config {
  #config: RawConfig;
  #assignments?: Assignment[];
  #splitRegistry?: SplitRegistry;

  constructor(config: RawConfig) {
    this.#config = config;
  }

  get url(): URL {
    return new URL(this.#config.url);
  }

  get cookieDomain(): string {
    return this.#config.cookieDomain;
  }

  get cookieName(): string {
    return this.#config.cookieName || DEFAULT_VISITOR_COOKIE_NAME;
  }

  get experienceSamplingWeight(): number {
    return this.#config.experienceSamplingWeight;
  }

  get splitRegistry(): SplitRegistry {
    const rawRegistry = this.#config.splits;
    if (!rawRegistry) {
      return new SplitRegistry(null);
    }

    if (!this.#splitRegistry) {
      const splits = Object.entries(rawRegistry).map(([splitName, rawSplit]) => {
        return new Split(splitName, rawSplit['feature_gate'], rawSplit['weights']);
      });

      this.#splitRegistry = new SplitRegistry(splits);
    }

    return this.#splitRegistry;
  }

  get assignments(): Assignment[] | null {
    const rawAssignments = this.#config.assignments;
    if (!rawAssignments) {
      return null;
    }

    if (!this.#assignments) {
      this.#assignments = Object.entries(rawAssignments).map(([splitName, variant]) => {
        return new Assignment({ splitName, variant, isUnsynced: false });
      });
    }

    return this.#assignments;
  }
}

export function loadConfig(config?: RawConfig): Config {
  if (config) {
    return new Config(config);
  }

  try {
    return new Config(JSON.parse(atob(window.TT!)));
  } catch {
    throw new Error('Unable to parse configuration');
  }
}
