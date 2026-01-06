export type Weighting = {
  [variant: string]: number;
};

export type Split = {
  name: string;
  isFeatureGate: boolean;
  weighting: Weighting;
};

export function getSplitVariants(split: Split): string[] {
  return Object.keys(split.weighting);
}
