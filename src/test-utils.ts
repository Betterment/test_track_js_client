import { Mock } from 'vitest';
import SplitRegistry from './splitRegistry';
import Split, { Weighting } from './split';

function mockSplitRegistry(v1RegistryHash: Record<string, Weighting>): Mock<() => SplitRegistry> {
  const mock = vi.fn();
  const splits: Split[] = [];

  for (const splitName in v1RegistryHash) {
    splits.push(new Split(splitName, false, v1RegistryHash[splitName]));
  }

  mock.mockReturnValue(new SplitRegistry(splits));

  return mock;
}

export { mockSplitRegistry };
