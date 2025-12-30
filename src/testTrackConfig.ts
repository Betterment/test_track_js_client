import Assignment from './assignment';
import Split from './split';
import SplitRegistry from './splitRegistry';

const DEFAULT_VISITOR_COOKIE_NAME = 'tt_visitor_id';

declare global {
  interface Window {
    TT: string;
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
  #config?: RawConfig;
  #assignments?: Assignment[];
  #splitRegistry?: SplitRegistry;

  constructor(config?: RawConfig) {
    this.#config = config;
  }

  #load(): RawConfig {
    try {
      return (this.#config ??= JSON.parse(atob(window.TT)));
    } catch {
      throw new Error('Unable to parse configuration');
    }
  }

  urlFor(path: string): URL {
    return new URL(path, this.#load().url);
  }

  getCookieDomain(): string {
    return this.#load().cookieDomain;
  }

  getCookieName(): string {
    return this.#load().cookieName || DEFAULT_VISITOR_COOKIE_NAME;
  }

  getExperienceSamplingWeight(): number {
    return this.#load().experienceSamplingWeight;
  }

  getSplitRegistry(): SplitRegistry {
    const rawRegistry = this.#load().splits;
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

  getAssignments(): Assignment[] | null {
    const rawAssignments = this.#load().assignments;
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

export default new Config();
