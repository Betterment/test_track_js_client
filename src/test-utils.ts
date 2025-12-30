import SplitRegistry from './splitRegistry';
import Split, { type Weighting } from './split';
import { Config } from './testTrackConfig';

export function createConfig(): Config {
  return new Config({
    url: 'http://testtrack.dev',
    cookieDomain: '.example.org',
    experienceSamplingWeight: 1
  });
}

export function createSplitRegistry(v1RegistryHash: Record<string, Weighting>): SplitRegistry {
  const splits: Split[] = [];

  for (const splitName in v1RegistryHash) {
    splits.push(new Split(splitName, false, v1RegistryHash[splitName]));
  }

  return new SplitRegistry(splits);
}
