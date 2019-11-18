class Split {
  constructor(name, isFeatureGate, weighting) {
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

  hasVariant(variant) {
    return variant in this._weighting;
  }
}

export default Split;
