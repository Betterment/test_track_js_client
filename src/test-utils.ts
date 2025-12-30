import SplitRegistry from './splitRegistry';
import Split, { type Weighting } from './split';
import { Config, type RawConfig } from './config';

export function createConfig(options: Partial<RawConfig> = {}): Config {
  return new Config({
    url: 'http://testtrack.dev',
    cookieDomain: '.example.org',
    experienceSamplingWeight: 1,
    ...options
  });
}

export function createSplitRegistry(v1RegistryHash: Record<string, Weighting>): SplitRegistry {
  const splits: Split[] = [];

  for (const splitName in v1RegistryHash) {
    splits.push(new Split(splitName, false, v1RegistryHash[splitName]));
  }

  return new SplitRegistry(splits);
}
