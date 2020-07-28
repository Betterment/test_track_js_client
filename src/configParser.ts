import { atob } from 'abab';

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
    const decodedConfig = atob(window.TT);
    if (decodedConfig) return JSON.parse(decodedConfig);
    throw new Error('Unable to parse configuration');
  }
}

export default ConfigParser;
