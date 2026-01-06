import type { Split, Weighting } from './split';

export type V1Hash = {
  [splitName: string]: Weighting;
};

export type SplitRegistry = {
  isLoaded: boolean;
  getSplit: (splitName: string) => Split | undefined;
  asV1Hash: () => V1Hash;
};

export function createSplitRegistry(input: Split[] | null): SplitRegistry {
  const isLoaded = input !== null;
  const splits = Object.fromEntries((input || []).map(split => [split.name, split]));

  return {
    isLoaded,
    getSplit: splitName => splits[splitName],
    asV1Hash: () => Object.fromEntries(Object.entries(splits).map(([splitName, split]) => [splitName, split.weighting]))
  };
}
