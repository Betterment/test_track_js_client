import base64 from 'base-64';

declare global {
  interface Window {
    TT: string;
  }
}

export type Config = {
  assignments: {
    [splitName: string]: string;
  };
  cookieDomain: string;
  cookieName: string;
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

class ConfigParser {
  getConfig(): Config {
    if (typeof window.atob === 'function') {
      return JSON.parse(window.atob(window.TT));
    } else {
      return JSON.parse(base64.decode(window.TT));
    }
  }
}

export default ConfigParser;
