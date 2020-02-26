export type Weighting = {
  [variant: string]: number;
};

class Split {
  private _name: string;
  private _isFeatureGate: boolean;
  private _weighting: Weighting;

  constructor(name: string, isFeatureGate: boolean, weighting: Weighting) {
    this._name = name;
    this._isFeatureGate = isFeatureGate;
    this._weighting = weighting;
  }

  getName() {
    return this._name;
  }

  isFeatureGate() {
    return this._isFeatureGate;
  }

  getVariants() {
    return Object.keys(this._weighting);
  }

  getWeighting() {
    return this._weighting;
  }

  hasVariant(variant: string) {
    return variant in this._weighting;
  }
}

export default Split;
