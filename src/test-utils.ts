import type { Mock } from 'vitest';
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

export function mockSplitRegistry(v1RegistryHash: Record<string, Weighting>): Mock<() => SplitRegistry> {
  const mock = vi.fn();
  const splits: Split[] = [];

  for (const splitName in v1RegistryHash) {
    splits.push(new Split(splitName, false, v1RegistryHash[splitName]));
  }

  mock.mockReturnValue(new SplitRegistry(splits));

  return mock;
}
