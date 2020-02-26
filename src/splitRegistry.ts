import Split, { Weighting } from './split';

export type V1Hash = {
  [splitName: string]: Weighting;
};

class SplitRegistry {
  private _splitArray: Split[];
  private _loaded: boolean;
  private _splits?: {
    [splitName: string]: Split;
  };

  constructor(splitArray: Split[] | null) {
    this._splitArray = splitArray || [];
    this._loaded = splitArray !== null;
  }

  getSplit(splitName: string) {
    return this.getSplits()[splitName];
  }

  isLoaded() {
    return this._loaded;
  }

  asV1Hash() {
    const v1Hash: V1Hash = {};
    for (let splitName in this.getSplits()) {
      const split = this.getSplits()[splitName];
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
