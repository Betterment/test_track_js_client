import Split, { type Weighting } from './split';

export type V1Hash = {
  [splitName: string]: Weighting;
};

class SplitRegistry {
  private _loaded: boolean;
  private _splits: {
    [splitName: string]: Split;
  };

  constructor(splitArray: Split[] | null) {
    this._loaded = splitArray !== null;
    this._splits = Object.fromEntries((splitArray || []).map(split => [split.getName(), split]));
  }

  getSplit(splitName: string): Split | undefined {
    return this._splits[splitName];
  }

  isLoaded(): boolean {
    return this._loaded;
  }

  asV1Hash(): V1Hash {
    return Object.fromEntries(
      Object.entries(this._splits).map(([splitName, split]) => [splitName, split.getWeighting()])
    );
  }
}

export default SplitRegistry;
