export type Weighting = {
  [variant: string]: number;
};

class Split {
  name: string;
  isFeatureGate: boolean;
  weighting: Weighting;

  constructor(name: string, isFeatureGate: boolean, weighting: Weighting) {
    this.name = name;
    this.isFeatureGate = isFeatureGate;
    this.weighting = weighting;
  }

  getVariants(): string[] {
    return Object.keys(this.weighting);
  }
}

export default Split;
