import SplitRegistry from './splitRegistry';
import Split from './split';

function mockSplitRegistry(v1RegistryHash) {
  let mock = jest.fn(),
    splits = [];

  for (var splitName in v1RegistryHash) {
    splits.push(new Split(splitName, false, v1RegistryHash[splitName]));
  }

  mock.mockReturnValue(new SplitRegistry(splits));

  return mock
}

export { mockSplitRegistry }
