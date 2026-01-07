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
  getSplit: (splitName: string) => Split | undefined;
  asV1Hash: () => V1Hash;
}>;

export function createSplitRegistry(input: Split[] | null): SplitRegistry {
  const isLoaded = input !== null;
  const splits = Object.fromEntries((input || []).map(split => [split.name, split]));

  return {
    isLoaded,
    getSplit: splitName => splits[splitName],
    asV1Hash: () => Object.fromEntries(Object.entries(splits).map(([splitName, split]) => [splitName, split.weighting]))
  };
}

export function getSplitVariants(split: Split): string[] {
  return Object.keys(split.weighting);
}
