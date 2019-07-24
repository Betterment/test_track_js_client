import SplitRegistry from './splitRegistry';
import Split from './split';

function mockSplitRegistry(v1RegistryHash) {
  let mock = jest.fn(),
    registryHash = {};

  for (var splitName in v1RegistryHash) {
    registryHash[splitName] = new Split(splitName, false, v1RegistryHash[splitName]);
  }

  mock.mockReturnValue(new SplitRegistry(registryHash));

  return mock
}

export { mockSplitRegistry }
