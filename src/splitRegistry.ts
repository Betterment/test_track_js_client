export type Weighting = Readonly<{
  [variant: string]: number;
}>;

export type Split = Readonly<{
  name: string;
  isFeatureGate: boolean;
  weighting: Weighting;
}>;

export type V1Hash = Readonly<{
  [splitName: string]: Weighting;
}>;

export type SplitRegistry = Readonly<{
  isLoaded: boolean;
  splits: ReadonlyArray<Split>;
  getSplit: (splitName: string) => Split | undefined;
  asV1Hash: () => V1Hash;
}>;

export function createSplitRegistry(input: Split[] | null): SplitRegistry {
  const isLoaded = input !== null;
  const splits = input ?? [];
  const splitLookup = Object.fromEntries(splits.map(split => [split.name, split]));

  return {
    isLoaded,
    splits,
    getSplit: splitName => splitLookup[splitName],
    asV1Hash: () => Object.fromEntries(splits.map(split => [split.name, split.weighting]))
  };
}

export function getSplitVariants(split: Split): string[] {
  return Object.keys(split.weighting);
}
