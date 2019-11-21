class SplitRegistry {
  constructor(splitArray) {
    this._splitArray = splitArray;
    this._loaded = splitArray !== null;
  }

  getSplit(splitName) {
    return this.getSplits()[splitName];
  }

  isLoaded() {
    return this._loaded;
  }

  asV1Hash() {
    const v1Hash = {};
    for (let splitName in this.getSplits()) {
      const split = this._splits[splitName];
      v1Hash[splitName] = split.getWeighting();
    }

    return v1Hash;
  }

  getSplits() {
    if (!this._loaded) {
      return {};
    }

    if (!this._splits) {
      this._splits = this._splitArray.reduce((result, split) => ({ ...result, [split.getName()]: split }), {});
    }

    return this._splits;
  }
}

export default SplitRegistry;
