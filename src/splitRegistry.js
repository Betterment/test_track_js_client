var SplitRegistry = function(splits) {
  this._splits = splits;
};

SplitRegistry.prototype.getSplit = function(splitName) {
  return this._splits && this._splits[splitName];
};

SplitRegistry.prototype.isUnavailable = function(splitName) {
  return this._splits === null;
};

SplitRegistry.prototype.asV1Hash = function(splitName) {
  var v1Hash = {};

  for (var splitName in this._splits) {
    var split = this._splits[splitName];
    v1Hash[splitName] = split.getWeighting();
  }

  return v1Hash;
};

export default SplitRegistry;
