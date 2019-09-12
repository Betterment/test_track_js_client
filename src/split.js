var Split = function(name, isFeatureGate, weighting) {
  this._name = name;
  this._isFeatureGate = isFeatureGate;
  this._weighting = weighting;
};

Split.prototype.getName = function() {
  return this._name;
};

Split.prototype.isFeatureGate = function() {
  return this._isFeatureGate;
};

Split.prototype.getVariants = function() {
  return Object.keys(this._weighting);
};

Split.prototype.getWeighting = function() {
  return this._weighting;
};

Split.prototype.hasVariant = function(variant) {
  return variant in this._weighting;
};

export default Split;
