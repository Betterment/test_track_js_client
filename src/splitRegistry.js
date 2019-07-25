var SplitRegistry = function(splitArray) {
  this._splitArray = splitArray;
  this._offline = splitArray == null;
};

SplitRegistry.prototype.getSplit = function(splitName) {
  return !this._offline && this.getSplits()[splitName];
};

SplitRegistry.prototype.isUnavailable = function() {
  return this._offline;
};

SplitRegistry.prototype.asV1Hash = function(splitName) {
  if (this._offline) {
    return {};
  }

  var v1Hash = {};
  for (var splitName in this.getSplits()) {
    var split = this._splits[splitName];
    v1Hash[splitName] = split.getWeighting();
  }

  return v1Hash;
};

SplitRegistry.prototype.getSplits = function() {
  if (!this._splits) {
    this._splits = {};
    this._splitArray.forEach(
      function(split) {
        this._splits[split.getName()] = split;
      }.bind(this)
    );
  }

  return this._splits;
};

export default SplitRegistry;
